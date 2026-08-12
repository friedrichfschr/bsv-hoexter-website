// @vitest-environment node
import { access, mkdtemp, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  defaultAboutContent,
  publishedAboutContent,
  readEditorialContent,
  updateAboutContent,
} from "@/lib/about-content";
import { replaceEditorialContent } from "@/lib/articles";
import { storeUpload } from "@/lib/uploads";

describe("dynamic About content", () => {
  it("seeds the confirmed founding BDK and its three source documents", () => {
    const publicContent = publishedAboutContent({ articles: [], documents: [], about: defaultAboutContent });
    expect(publicContent.foundingBdk?.date).toBe("2026-07-02");
    expect(publicContent.foundingBdk?.location).toContain("Schulen der Brede");
    expect(publicContent.foundingBdk?.documentIds).toHaveLength(3);
    expect(publicContent.currentStatute?.title).toContain("Satzung");
  });

  it("does not expose draft Vorstand or BDK records publicly", () => {
    const content = structuredClone(defaultAboutContent);
    content.boards.push({
      id: "vorstand-entwurf",
      term: "2027/28",
      startDate: "2027-08-01",
      endDate: "",
      message: "Dieser Text ist noch nicht freigegeben.",
      photoId: "",
      photoAlt: "",
      status: "draft",
    });
    content.bdks.push({
      id: "bdk-entwurf",
      title: "Nächste BDK",
      date: "2027-09-01",
      location: "Höxter",
      summary: "Interner Entwurf für die nächste Konferenz.",
      documentIds: [],
      founding: false,
      status: "draft",
    });

    const publicContent = publishedAboutContent({ articles: [], documents: [], about: content });
    expect(publicContent.boards.some((board) => board.id === "vorstand-entwurf")).toBe(false);
    expect(publicContent.bdks.some((bdk) => bdk.id === "bdk-entwurf")).toBe(false);
  });

  it("selects only the active board as current", () => {
    const content = structuredClone(defaultAboutContent);
    content.boards.push({ ...content.boards[0], id: "vorstand-zukunft", term: "2027/28", startDate: "2027-08-01" });
    const publicContent = publishedAboutContent({ articles: [], documents: [], about: content }, "2026-08-12");
    expect(publicContent.currentBoard?.id).toBe("bezirksvorstand-2026-27");
    expect(publicContent.previousBoards.some((board) => board.id === "vorstand-zukunft")).toBe(false);
  });

  it("does not activate a future statute early", () => {
    const content = structuredClone(defaultAboutContent);
    content.documents.push({ ...content.documents[0], id: "satzung-zukunft", title: "Zukünftige Satzung", date: "2027-01-01" });
    const publicContent = publishedAboutContent({ articles: [], documents: [], about: content }, "2026-08-12");
    expect(publicContent.currentStatute?.id).toBe("satzung-2026");
    expect(publicContent.previousStatutes.some((document) => document.id === "satzung-zukunft")).toBe(false);
  });

  it("serializes About updates through the editorial repository", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-"));
    await updateAboutContent(directory, {
      ...defaultAboutContent,
      intro: "Aktualisierte öffentliche Einführung der BSV Höxter.",
    });

    expect((await readEditorialContent(directory)).about.intro).toBe("Aktualisierte öffentliche Einführung der BSV Höxter.");
  });

  it("preserves edited About content when the legacy article workspace omits About data", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-legacy-"));
    await updateAboutContent(directory, { ...defaultAboutContent, intro: "Eine dauerhaft bearbeitete Einführung der BSV Höxter." });
    await replaceEditorialContent(directory, { articles: [], documents: [] });
    expect((await readEditorialContent(directory)).about.intro).toBe("Eine dauerhaft bearbeitete Einführung der BSV Höxter.");
  });

  it("rejects duplicate record identifiers and impossible dates", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-invalid-"));
    await expect(updateAboutContent(directory, {
      ...defaultAboutContent,
      bdks: [
        ...defaultAboutContent.bdks,
        { ...defaultAboutContent.bdks[0], date: "2026-02-30" },
      ],
    })).rejects.toThrow();
  });

  it("applies About invariants to legacy whole-workspace replacements", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-replace-"));
    await expect(replaceEditorialContent(directory, {
      articles: [],
      documents: [],
      about: { ...defaultAboutContent, boards: [defaultAboutContent.boards[0], defaultAboutContent.boards[0]] },
    })).rejects.toThrow("ID ist mehrfach vergeben");
  });

  it("rejects a published photo whose payload is missing", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-payload-"));
    const upload = await storeUpload(path.join(directory, "media"), new File([
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ], "vorstand.png", { type: "image/png" }));
    await unlink(path.join(directory, "media", upload.storedName));
    await expect(updateAboutContent(directory, {
      ...defaultAboutContent,
      boards: [{ ...defaultAboutContent.boards[0], photoId: upload.id, photoAlt: "Der aktuelle Bezirksvorstand" }],
    })).rejects.toThrow("Vorstandsfoto");
  });

  it("removes a replaced About upload after the content write", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-cleanup-"));
    const upload = await storeUpload(path.join(directory, "media"), new File([
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ], "vorstand.png", { type: "image/png" }));
    await updateAboutContent(directory, {
      ...defaultAboutContent,
      boards: [{ ...defaultAboutContent.boards[0], photoId: upload.id, photoAlt: "Der aktuelle Bezirksvorstand" }],
    });
    await updateAboutContent(directory, defaultAboutContent);
    await expect(access(path.join(directory, "media", upload.storedName))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects a bundled PDF when its public backing file is missing", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-bundled-"));
    const about = structuredClone(defaultAboutContent);
    about.documents[0] = { ...about.documents[0], bundledFile: "nicht-vorhanden.pdf" };
    await expect(updateAboutContent(directory, about)).rejects.toThrow("PDF wurde nicht gefunden");
  });

  it("rejects ambiguous public archive relationships", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-relations-"));
    await expect(updateAboutContent(directory, {
      ...defaultAboutContent,
      boards: [
        defaultAboutContent.boards[0],
        { ...defaultAboutContent.boards[0], id: "zweiter-aktueller-vorstand", term: "2027/28", startDate: "2027-07-01" },
      ],
    })).rejects.toThrow("aktuellen Bezirksvorstand");
    await expect(updateAboutContent(directory, {
      ...defaultAboutContent,
      bdks: [
        defaultAboutContent.bdks[0],
        { ...defaultAboutContent.bdks[0], id: "zweite-gruendung", founding: true },
      ],
    })).rejects.toThrow("Gründungs-BDK");
  });

  it("rejects overlapping published board terms", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-overlap-"));
    await expect(updateAboutContent(directory, {
      ...defaultAboutContent,
      boards: [
        { ...defaultAboutContent.boards[0], endDate: "2027-08-01" },
        { ...defaultAboutContent.boards[0], id: "vorstand-2027-28", term: "2027/28", startDate: "2027-07-01", endDate: "2028-07-01" },
      ],
    })).rejects.toThrow("überschneiden");
  });

  it("rejects impossible board terms and draft documents on published BDKs", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-cross-fields-"));
    await expect(updateAboutContent(directory, {
      ...defaultAboutContent,
      boards: [{ ...defaultAboutContent.boards[0], endDate: "2026-01-01" }],
    })).rejects.toThrow("Ende der Amtszeit");
    await expect(updateAboutContent(directory, {
      ...defaultAboutContent,
      documents: defaultAboutContent.documents.map((document, index) => index === 0 ? { ...document, status: "draft" as const } : document),
    })).rejects.toThrow("veröffentlichte Dokumente");
  });
});
