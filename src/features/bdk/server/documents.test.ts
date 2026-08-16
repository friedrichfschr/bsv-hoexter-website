// @vitest-environment node
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BdkDocumentService } from "@/features/bdk/server/documents";
import { LocalBdkRepository } from "@/features/bdk/server/repository";
import { readStoredUpload } from "@/shared/server/uploads";

const pdf = (name = "einladung.pdf") => new File([new TextEncoder().encode("%PDF-1.7\nexample")], name, { type: "application/pdf" });

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "bsv-bdk-docs-"));
  const repository = new LocalBdkRepository(path.join(root, "data"), () => new Date("2026-08-01T10:00:00Z"));
  return { root, repository, service: new BdkDocumentService(repository, path.join(root, "media")) };
}

describe("BDK document lifecycle", () => {
  it("accepts only known PDF document kinds", async () => {
    const { service } = await fixture();
    await expect(service.upload("unknown", pdf())).rejects.toThrow("Dokumentart");
    await expect(service.upload("delegate-key", new File(["image"], "bild.png", { type: "image/png" }))).rejects.toThrow("PDF");
  });

  it("requires a date before attaching the invitation", async () => {
    const { service } = await fixture();
    await expect(service.upload("invitation", pdf())).rejects.toThrow("Termin");
  });

  it("attaches PDFs and removes replaced payloads after persistence", async () => {
    const { repository, service, root } = await fixture();
    await repository.updateEvent({ title: "BDK", subtitle: "", date: "2026-08-20", time: "10:00", location: "Brakel" });
    const first = await service.upload("invitation", pdf("erste.pdf"));
    const second = await service.upload("invitation", pdf("zweite.pdf"));
    expect((await repository.read()).event.invitationId).toBe(second.id);
    await expect(readStoredUpload(path.join(root, "media"), first.id)).resolves.toBeUndefined();
  });

  it("serves only an owned PDF of the current public event", async () => {
    const { repository, service, root } = await fixture();
    await repository.updateEvent({ title: "BDK", subtitle: "", date: "2026-08-20", time: "", location: "" });
    const upload = await service.upload("delegate-key", pdf("schluessel.pdf"));
    await expect(service.readPublic("delegate-key", "2026-08-20")).resolves.toMatchObject({ id: upload.id, originalName: "schluessel.pdf" });
    await expect(service.readPublic("delegate-key", "2026-08-21")).resolves.toBeUndefined();
    await writeFile(path.join(root, "media", `${upload.id}.json`), JSON.stringify({ id: upload.id, storedName: "../secret", mediaType: "application/pdf" }));
    await expect(service.readPublic("delegate-key", "2026-08-20")).resolves.toBeUndefined();
  });

  it("removes an attached document from state and storage", async () => {
    const { repository, service, root } = await fixture();
    const upload = await service.upload("delegate-key", pdf("schluessel.pdf"));
    await service.remove("delegate-key");
    expect((await repository.read()).event.delegateKeyId).toBe("");
    await expect(readStoredUpload(path.join(root, "media"), upload.id)).resolves.toBeUndefined();
  });

  it("clears and deletes old public PDFs when preparing a new event", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "bsv-bdk-reset-docs-"));
    let now = new Date("2026-08-01T10:00:00Z");
    const repository = new LocalBdkRepository(path.join(root, "data"), () => now);
    const service = new BdkDocumentService(repository, path.join(root, "media"));
    await repository.updateEvent({ title: "BDK", subtitle: "", date: "2026-08-01", time: "", location: "" });
    const invitation = await service.upload("invitation", pdf());
    const delegateKey = await service.upload("delegate-key", pdf("delegiertenschluessel.pdf"));
    now = new Date("2026-08-02T10:00:00Z");
    const next = await service.prepareNewEvent("2026-08-02");
    expect(next).toMatchObject({ invitationId: "", delegateKeyId: "" });
    await expect(readStoredUpload(path.join(root, "media"), invitation.id)).resolves.toBeUndefined();
    await expect(readStoredUpload(path.join(root, "media"), delegateKey.id)).resolves.toBeUndefined();
  });
});
