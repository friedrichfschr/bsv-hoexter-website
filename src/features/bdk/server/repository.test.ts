// @vitest-environment node
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BdkSignupUnavailableError, LocalBdkRepository, DuplicateBdkSignupError } from "@/features/bdk/server/repository";

const signup = (email: string) => ({
  firstName: "Erika",
  lastName: "Muster",
  grade: "Q1" as const,
  gradeOther: "",
  email,
  school: "schulen-der-brede-brakel",
  schoolOther: "",
  role: "district-delegate" as const,
  message: "",
  privacyAccepted: true as const,
});

async function repository(now = new Date("2026-08-01T10:00:00Z")) {
  const directory = await mkdtemp(path.join(tmpdir(), "bsv-bdk-"));
  return new LocalBdkRepository(directory, () => now);
}

describe("LocalBdkRepository", () => {
  it("creates and persists an initial prepared event", async () => {
    const repo = await repository();
    const first = await repo.read();
    const second = await repo.read();
    expect(first.event.id).toBe(second.event.id);
    expect(first).toMatchObject({ signups: [], event: { date: "", invitationId: "", delegateKeyId: "" } });
  });

  it("serializes concurrent signup creation without data loss", async () => {
    const repo = await repository();
    const records = await Promise.all(Array.from({ length: 12 }, (_, index) => repo.createSignup(signup(`person-${index}@example.org`))));
    const state = await repo.read();
    expect(state.signups).toHaveLength(12);
    expect(new Set(records.map((record) => record.id))).toHaveLength(12);
  });

  it("returns an exact active retry and rejects a conflicting active email", async () => {
    const repo = await repository();
    const first = await repo.createSignup(signup("same@example.org"));
    await expect(repo.createSignup(signup("SAME@example.org"))).resolves.toEqual(first);
    await expect(repo.createSignup({ ...signup("same@example.org"), firstName: "Andere" })).rejects.toBeInstanceOf(DuplicateBdkSignupError);
  });

  it("rejects registrations for a passed event", async () => {
    const repo = await repository();
    await repo.updateEvent({ title: "Vergangene BDK", subtitle: "", date: "2026-07-31", time: "", location: "" });
    await expect(repo.createSignup(signup("late@example.org"))).rejects.toBeInstanceOf(BdkSignupUnavailableError);
  });

  it("cancels, reactivates, and deletes signups", async () => {
    const repo = await repository();
    const created = await repo.createSignup(signup("lifecycle@example.org"));
    expect((await repo.setSignupStatus(created.id, "cancelled")).status).toBe("cancelled");
    expect((await repo.setSignupStatus(created.id, "active")).cancelledAt).toBe("");
    await repo.deleteSignup(created.id);
    expect((await repo.read()).signups).toEqual([]);
  });

  it("prepares a fresh event while retaining previous signups", async () => {
    const repo = await repository();
    await repo.updateEvent({ title: "BDK August", subtitle: "", date: "2026-08-01", time: "10:00", location: "Brakel" });
    const signupRecord = await repo.createSignup(signup("retained@example.org"));
    const currentEventId = (await repo.read()).event.id;
    await repo.setDocument("invitation", "11111111-1111-4111-8111-111111111111", currentEventId);
    await repo.setDocument("delegate-key", "22222222-2222-4222-8222-222222222222", currentEventId);
    const next = await repo.prepareNewEvent("2026-08-02");
    expect(next.event.id).not.toBe(signupRecord.eventId);
    expect(next.event).toMatchObject({ date: "", invitationId: "", delegateKeyId: "" });
    expect(next.previousDocumentIds).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]);
    expect((await repo.read()).signups.map((record) => record.id)).toContain(signupRecord.id);
  });

  it("does not attach an invitation to a prepared event without a date", async () => {
    const repo = await repository();
    const eventId = (await repo.read()).event.id;
    await expect(repo.setDocument("invitation", "11111111-1111-4111-8111-111111111111", eventId))
      .rejects.toThrow("Termin");
  });

  it("does not attach an upload to an event that changed during storage", async () => {
    const repo = await repository();
    await repo.updateEvent({ title: "Alte BDK", subtitle: "", date: "2026-07-31", time: "", location: "" });
    const previousEventId = (await repo.read()).event.id;
    await repo.prepareNewEvent("2026-08-01");
    await expect(repo.setDocument("delegate-key", "11111111-1111-4111-8111-111111111111", previousEventId))
      .rejects.toThrow("geändert");
  });

  it("retains records through day 14 and removes every status after it", async () => {
    let now = new Date("2026-08-01T10:00:00Z");
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-bdk-retention-"));
    const repo = new LocalBdkRepository(directory, () => now);
    await repo.updateEvent({ title: "BDK August", subtitle: "", date: "2026-08-01", time: "10:00", location: "Brakel" });
    const active = await repo.createSignup(signup("active@example.org"));
    const cancelled = await repo.createSignup(signup("cancelled@example.org"));
    await repo.setSignupStatus(cancelled.id, "cancelled");

    now = new Date("2026-08-15T12:00:00Z");
    expect((await repo.read()).signups).toHaveLength(2);
    now = new Date("2026-08-16T12:00:00Z");
    expect((await repo.read()).signups).toEqual([]);
    expect(active.status).toBe("active");
  });

  it("updates current-event snapshots when its date is corrected", async () => {
    const repo = await repository();
    await repo.updateEvent({ title: "BDK", subtitle: "", date: "2026-08-10", time: "", location: "Höxter" });
    await repo.createSignup(signup("corrected@example.org"));
    await repo.updateEvent({ title: "BDK verschoben", subtitle: "", date: "2026-08-20", time: "", location: "Höxter" });
    expect((await repo.read()).signups[0]).toMatchObject({ eventTitle: "BDK verschoben", eventDate: "2026-08-20" });
  });

  it("rejects an oversized untrusted state file", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-bdk-oversized-"));
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "bdk.json"), " ".repeat(2_000_001));
    await expect(new LocalBdkRepository(directory).read()).rejects.toThrow("zu groß");
  });
});
