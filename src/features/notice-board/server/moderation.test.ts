// @vitest-environment node
import { mkdtemp, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readStoredUpload, storeUpload } from "@/lib/uploads";
import {
  createNoticeBoardSubmission,
  publicEventEntries,
  publicPosterEntries,
  purgeRejectedEntries,
  readNoticeBoardContent,
  updateEventEntry,
  updatePosterEntry,
} from "@/features/notice-board/server/moderation";

const eventSubmission = {
  submissionKind: "both" as const,
  title: "Testveranstaltung",
  organizer: "Testveranstalter",
  category: "Freizeit" as const,
  website: "https://example.org/termin",
  date: "2026-11-08",
  location: "Höxter",
  ageRange: "14 bis 18 Jahre",
  contactName: "",
  contactEmail: "kontakt@example.org",
  description: "Eine ausreichend ausführliche Beschreibung für den Moderationstest.",
  posterExpiresAt: "2026-11-09",
  consent: true as const,
};

const png = new File([
  new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
], "poster.png", { type: "image/png" });

describe("notice-board moderation", () => {
  it("creates private pending event and poster records", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-board-create-"));
    const upload = await storeUpload(path.join(directory, "board-media"), png);

    const created = await createNoticeBoardSubmission(directory, eventSubmission, upload, new Date("2026-08-12T10:00:00Z"));
    const stored = await readNoticeBoardContent(directory);

    expect(created.event).toMatchObject({ status: "pending", title: "Testveranstaltung" });
    expect(created.poster).toMatchObject({ status: "pending", mediaId: upload.id, eventId: created.event?.id });
    expect(stored.events).toEqual([created.event]);
    expect(stored.posters).toEqual([created.poster]);
    expect(publicEventEntries(stored)).toEqual([]);
    expect(publicPosterEntries(stored, "2026-08-12")).toEqual([]);
  });

  it("removes a newly stored poster when creating its moderation record fails", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-board-cleanup-"));
    const mediaDirectory = path.join(directory, "board-media");
    const upload = await storeUpload(mediaDirectory, png);
    await writeFile(path.join(directory, "notice-board.json"), "invalid-json", "utf8");

    await expect(createNoticeBoardSubmission(directory, { ...eventSubmission, submissionKind: "poster" }, upload)).rejects.toThrow();
    await expect(readStoredUpload(mediaDirectory, upload.id)).resolves.toBeUndefined();
    await expect(readFile(path.join(mediaDirectory, upload.storedName))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("publishes administrator-corrected event values only after approval", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-board-event-"));
    const created = await createNoticeBoardSubmission(directory, { ...eventSubmission, submissionKind: "event" }, undefined, new Date("2026-08-12T10:00:00Z"));

    const approved = await updateEventEntry(directory, created.event!.id, {
      title: "Korrigierter Titel",
      description: "Die Redaktion hat diese ausreichend lange Beschreibung korrigiert.",
      date: "2026-11-09",
      location: "Brakel",
      ageRange: "15 bis 19 Jahre",
      website: "https://example.org/korrigiert",
      organizer: "Korrigierter Veranstalter",
      category: "Hobbys",
      status: "approved",
    });

    expect(approved).toMatchObject({ title: "Korrigierter Titel", location: "Brakel", status: "approved" });
    expect(publicEventEntries(await readNoticeBoardContent(directory))).toEqual([approved]);
  });

  it("requires bounded placement and expiry before poster approval", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-board-bounds-"));
    const upload = await storeUpload(path.join(directory, "board-media"), png);
    const created = await createNoticeBoardSubmission(directory, { ...eventSubmission, submissionKind: "poster" }, upload);

    await expect(updatePosterEntry(directory, created.poster!.id, {
      status: "approved",
      expiresAt: "2026-11-08",
      placement: { boardId: "left", left: 90, top: 10, width: 20, height: 30, rotation: 0 },
    })).rejects.toThrow();
    await expect(updatePosterEntry(directory, created.poster!.id, {
      status: "approved",
      expiresAt: "",
      placement: { boardId: "left", left: 10, top: 10, width: 20, height: 30, rotation: 0 },
    })).rejects.toThrow();
  });

  it("refuses approval when the stored poster payload is missing", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-board-missing-media-"));
    const mediaDirectory = path.join(directory, "board-media");
    const upload = await storeUpload(mediaDirectory, png);
    const created = await createNoticeBoardSubmission(directory, { ...eventSubmission, submissionKind: "poster" }, upload);
    await unlink(path.join(mediaDirectory, upload.storedName));

    await expect(updatePosterEntry(directory, created.poster!.id, {
      status: "approved",
      expiresAt: "2026-11-08",
      placement: { boardId: "left", left: 10, top: 10, width: 20, height: 30, rotation: 0 },
    })).rejects.toThrow("Posterdatei");
  });

  it("assigns newer approvals a higher layer and hides posters on their expiry date", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-board-layer-"));
    const firstUpload = await storeUpload(path.join(directory, "board-media"), png);
    const secondUpload = await storeUpload(path.join(directory, "board-media"), png);
    const first = await createNoticeBoardSubmission(directory, { ...eventSubmission, submissionKind: "poster", title: "Erstes Poster" }, firstUpload);
    const second = await createNoticeBoardSubmission(directory, { ...eventSubmission, submissionKind: "poster", title: "Zweites Poster" }, secondUpload);
    const placement = { boardId: "left" as const, left: 10, top: 10, width: 20, height: 30, rotation: 0 };

    const firstApproved = await updatePosterEntry(directory, first.poster!.id, { status: "approved", expiresAt: "2026-11-08", placement });
    const secondApproved = await updatePosterEntry(directory, second.poster!.id, { status: "approved", expiresAt: "2026-11-09", placement });

    expect(secondApproved.layer).toBeGreaterThan(firstApproved.layer);
    const stored = await readNoticeBoardContent(directory);
    expect(publicPosterEntries(stored, "2026-11-07").map((poster) => poster.id)).toEqual([firstApproved.id, secondApproved.id]);
    expect(publicPosterEntries(stored, "2026-11-08").map((poster) => poster.id)).toEqual([secondApproved.id]);
  });

  it("retains rejected entries for 30 days and then purges records and poster media", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-board-rejected-"));
    const mediaDirectory = path.join(directory, "board-media");
    const upload = await storeUpload(mediaDirectory, png);
    const created = await createNoticeBoardSubmission(directory, eventSubmission, upload, new Date("2026-08-01T10:00:00Z"));
    const rejectedAt = new Date("2026-08-02T10:00:00Z");
    await updateEventEntry(directory, created.event!.id, { ...created.event, status: "rejected" }, rejectedAt);
    await updatePosterEntry(directory, created.poster!.id, { status: "rejected", expiresAt: created.poster!.expiresAt }, rejectedAt);

    expect((await purgeRejectedEntries(directory, new Date("2026-09-01T09:59:59Z"))).events).toHaveLength(1);
    const purged = await purgeRejectedEntries(directory, new Date("2026-09-01T10:00:00Z"));
    expect(purged.events).toEqual([]);
    expect(purged.posters).toEqual([]);
    await expect(readStoredUpload(mediaDirectory, upload.id)).resolves.toBeUndefined();
    await expect(readFile(path.join(mediaDirectory, upload.storedName))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
