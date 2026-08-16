// @vitest-environment node
import { access, mkdtemp, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  defaultAboutContent,
  normalizeAboutEditorialContent,
  publishedAboutContent,
  readEditorialContent,
  updateAboutContent,
} from "@/features/about/server/content-service";
import { replaceEditorialContent } from "@/lib/articles";
import { storeUpload } from "@/shared/server/uploads";

describe("dynamic About content", () => {
  it("seeds the founding BDK documents while keeping the Satzung separate", () => {
    const publicContent = publishedAboutContent({ articles: [], documents: [], about: defaultAboutContent });
    expect(publicContent.foundingBdk?.date).toBe("2026-07-02");
    expect(publicContent.foundingBdk?.location).toContain("Schulen der Brede");
    expect(publicContent.foundingBdk?.documentIds).toHaveLength(2);
    expect(publicContent.currentStatute?.title).toContain("Satzung");
    expect(defaultAboutContent.activeBoardId).toBe("bezirksvorstand-2026-27");
    expect(publicContent.foundingBdk?.photoIds).toHaveLength(2);
  });

  it("keeps founding metadata and photos hardcoded while allowing document changes", () => {
    const content = structuredClone(defaultAboutContent);
    content.bdks[0] = { ...content.bdks[0], title: "Manipulierter Titel", location: "Anderer Ort", photoIds: [], documentIds: ["satzung-2026", "gruendungs-bdk-einladungen-2026"] };
    content.media[0] = { ...content.media[0], caption: "Manipuliertes Foto", alt: "Manipuliertes Foto" };

    const publicContent = publishedAboutContent({ articles: [], documents: [], about: content }, "2026-08-14");
    expect(publicContent.foundingBdk?.title).toBe(defaultAboutContent.bdks[0].title);
    expect(publicContent.foundingBdk?.location).toBe(defaultAboutContent.bdks[0].location);
    expect(publicContent.foundingBdk?.photoIds).toEqual(defaultAboutContent.bdks[0].photoIds);
    expect(publicContent.foundingBdk?.documentIds).toEqual(["gruendungs-bdk-einladungen-2026"]);
    expect(publicContent.media.find((media) => media.id === defaultAboutContent.media[0].id)?.caption).toBe(defaultAboutContent.media[0].caption);
  });

  it("keeps founding photo captions as their alternative text and drops legacy BDK photos", () => {
    const content = structuredClone(defaultAboutContent);
    content.media.push({ id: "archivfoto", alt: "Alter Alternativtext", caption: "Gemeinsame Beratung im BDK", status: "draft", mediaId: "", bundledFile: "" });
    const normalized = normalizeAboutEditorialContent(content);
    expect(normalized.media).toEqual(defaultAboutContent.media);
    expect(normalized.media.every((media) => media.alt === media.caption)).toBe(true);
  });

  it("keeps multiple Vorstand photos and migrates the legacy single photo", () => {
    const multiple = normalizeAboutEditorialContent({
      ...defaultAboutContent,
      boards: [{
        ...defaultAboutContent.boards[0],
        photos: [
          { id: "vorstand-gruppe", alt: "Der Bezirksvorstand" },
          { id: "landesdelegierte", alt: "Die Landesdelegierten" },
        ],
      }],
    });
    expect(multiple.boards[0]).toMatchObject({
      photos: [
        { id: "vorstand-gruppe", alt: "Der Bezirksvorstand" },
        { id: "landesdelegierte", alt: "Die Landesdelegierten" },
      ],
    });

    const legacy = normalizeAboutEditorialContent({
      ...defaultAboutContent,
      boards: [{ ...defaultAboutContent.boards[0], photoId: "altes-vorstandsfoto", photoAlt: "Alter Bezirksvorstand" }],
    });
    expect(legacy.boards[0]).toMatchObject({ photos: [{ id: "altes-vorstandsfoto", alt: "Alter Bezirksvorstand" }] });
  });

  it("uses the explicitly designated active Vorstand", () => {
    const content = structuredClone(defaultAboutContent);
    content.boards.unshift({
      ...content.boards[0],
      id: "bezirksvorstand-2025-26",
      term: "2025/26",
      startDate: "2025-07-01",
      endDate: "2026-06-30",
    });
    content.activeBoardId = "bezirksvorstand-2026-27";

    const publicContent = publishedAboutContent({ articles: [], documents: [], about: content }, "2026-08-14");
    expect(publicContent.currentBoard?.id).toBe("bezirksvorstand-2026-27");
    expect(publicContent.previousBoards.map((board) => board.id)).toContain("bezirksvorstand-2025-26");
  });

  it("sorts Vorstände by start date and derives their end dates", () => {
    const content = structuredClone(defaultAboutContent);
    content.boards = [
      { ...content.boards[0], id: "vorstand-2025", term: "2025/26", startDate: "2025-08-15", endDate: "", status: "draft" },
      { ...content.boards[0], id: "vorstand-2027", term: "2027/28", startDate: "2027-08-01", endDate: "2028-12-31", status: "draft" },
      { ...content.boards[0], id: "bezirksvorstand-2026-27", term: "2026/27", startDate: "2026-07-02", endDate: "2099-01-01", status: "draft" },
    ];

    const normalized = normalizeAboutEditorialContent(content);
    expect(normalized.boards.map((board) => board.id)).toEqual(["vorstand-2027", "bezirksvorstand-2026-27", "vorstand-2025"]);
    expect(normalized.boards.map((board) => board.endDate)).toEqual(["", "2027-07-31", "2026-07-01"]);
    expect(normalized.boards.every((board) => board.status === "published")).toBe(true);
  });

  it("sorts Satzungen by effective date and derives their end dates", () => {
    const content = structuredClone(defaultAboutContent);
    const statute = content.documents.find((document) => document.kind === "satzung")!;
    content.documents.push(
      { ...statute, id: "satzung-2025", number: "0", date: "2025-01-01", effectiveFrom: "2025-01-01", effectiveUntil: "", status: "draft" },
      { ...statute, id: "satzung-2027", number: "2", date: "2027-03-10", effectiveFrom: "2027-03-10", effectiveUntil: "2099-01-01", status: "draft" },
    );

    const normalized = normalizeAboutEditorialContent(content);
    const statutes = normalized.documents.filter((document) => document.kind === "satzung");
    expect(statutes.map((document) => document.id)).toEqual(["satzung-2027", "satzung-2026", "satzung-2025"]);
    expect(statutes.map((document) => document.effectiveUntil)).toEqual(["", "2027-03-09", "2026-07-01"]);
    expect(statutes.every((document) => document.status === "published")).toBe(true);
  });

  it("publishes BDKs without time or place and removes non-founding photos", () => {
    const content = structuredClone(defaultAboutContent);
    content.media.push({ id: "altes-bdk-foto", alt: "Altes Foto", caption: "Altes Foto", status: "published", mediaId: "alter-upload", bundledFile: "" });
    content.bdks.push({
      ...content.bdks[0],
      id: "bdk-ohne-ort",
      title: "BDK ohne Ortsangabe",
      date: "2027-01-02",
      time: "",
      location: "",
      documentIds: [],
      photoIds: ["altes-bdk-foto"],
      founding: false,
      status: "draft",
    });

    const normalized = normalizeAboutEditorialContent(content);
    const bdk = normalized.bdks.find((record) => record.id === "bdk-ohne-ort");
    expect(bdk).toMatchObject({ time: "", location: "", photoIds: [], status: "published" });
    expect(normalized.media.some((media) => media.id === "altes-bdk-foto")).toBe(false);
  });

  it("archives every other published Vorstand independently of its status", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-multiple-published-"));
    const content = structuredClone(defaultAboutContent);
    content.boards.push({ ...content.boards[0], id: "vorstand-archiv", term: "Archiv", startDate: "2025-01-01", endDate: "" });

    await expect(updateAboutContent(directory, content)).resolves.toMatchObject({ activeBoardId: content.activeBoardId });
    const publicContent = publishedAboutContent({ articles: [], documents: [], about: content }, "2026-08-14");
    expect(publicContent.currentBoard?.id).toBe(content.activeBoardId);
    expect(publicContent.previousBoards.map((board) => board.id)).toContain("vorstand-archiv");
  });

  it("rejects an unknown active Vorstand reference", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-active-"));
    await expect(updateAboutContent(directory, {
      ...defaultAboutContent,
      activeBoardId: "nicht-vorhanden",
    })).rejects.toThrow("Aktiver Bezirksvorstand");
  });

  it("rejects a future Vorstand as the active board", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-future-active-"));
    const content = structuredClone(defaultAboutContent);
    content.boards[0].endDate = "2098-12-31";
    content.boards.push({ ...content.boards[0], id: "vorstand-2099", term: "2099/2100", startDate: "2099-01-01", endDate: "" });
    content.activeBoardId = "vorstand-2099";
    await expect(updateAboutContent(directory, content)).rejects.toThrow("Amtszeit des aktiven Bezirksvorstands");
  });

  it("uses statute validity instead of upload date", () => {
    const content = structuredClone(defaultAboutContent);
    content.documents.push({
      ...content.documents[0],
      id: "satzung-2",
      title: "Satzung Nummer 2",
      number: "2",
      date: "2026-06-01",
      effectiveFrom: "2027-01-01",
      effectiveUntil: "",
    });
    const publicContent = publishedAboutContent({ articles: [], documents: [], about: content }, "2026-08-14");
    expect(publicContent.currentStatute?.id).toBe("satzung-2026");
  });

  it("rejects unsafe archive links", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-links-"));
    await expect(updateAboutContent(directory, {
      ...defaultAboutContent,
      bdks: [{ ...defaultAboutContent.bdks[0], links: [{ label: "Unsicher", url: "javascript:alert(1)" }] }],
    })).rejects.toThrow();
  });

  it("ignores legacy visibility flags for Vorstand and BDK records", () => {
    const content = structuredClone(defaultAboutContent);
    content.boards.push({
      id: "vorstand-entwurf",
      term: "2027/28",
      startDate: "2026-01-01",
      endDate: "",
      message: "Dieser Text ist noch nicht freigegeben.",
      photoId: "",
      photoAlt: "",
      photos: [],
      status: "draft",
    });
    content.bdks.push({
      id: "bdk-entwurf",
      title: "Nächste BDK",
      subtitle: "",
      date: "2027-09-01",
      time: "00:00",
      location: "Höxter",
      summary: "Interner Entwurf für die nächste Konferenz.",
      documentIds: [],
      photoIds: [],
      links: [],
      founding: false,
      status: "draft",
    });

    const publicContent = publishedAboutContent({ articles: [], documents: [], about: content });
    expect(publicContent.boards.some((board) => board.id === "vorstand-entwurf")).toBe(true);
    expect(publicContent.bdks.some((bdk) => bdk.id === "bdk-entwurf")).toBe(true);
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
    content.documents.push({ ...content.documents[0], id: "satzung-zukunft", title: "Zukünftige Satzung", date: "2027-01-01", effectiveFrom: "2027-01-01" });
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

  it("validates every Vorstand photo payload", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-multi-photo-payload-"));
    const first = await storeUpload(path.join(directory, "media"), new File([
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ], "vorstand.png", { type: "image/png" }));
    const missing = await storeUpload(path.join(directory, "media"), new File([
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ], "landesdelegierte.png", { type: "image/png" }));
    await unlink(path.join(directory, "media", missing.storedName));

    await expect(updateAboutContent(directory, {
      ...defaultAboutContent,
      boards: [{
        ...defaultAboutContent.boards[0],
        photos: [
          { id: first.id, alt: "Der Bezirksvorstand" },
          { id: missing.id, alt: "Die Landesdelegierten" },
        ],
      }],
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

  it("removes only Vorstand photos no longer referenced", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-multi-photo-cleanup-"));
    const first = await storeUpload(path.join(directory, "media"), new File([
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ], "vorstand.png", { type: "image/png" }));
    const second = await storeUpload(path.join(directory, "media"), new File([
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ], "landesdelegierte.png", { type: "image/png" }));
    const photos = [
      { id: first.id, alt: "Der Bezirksvorstand" },
      { id: second.id, alt: "Die Landesdelegierten" },
    ];
    await updateAboutContent(directory, { ...defaultAboutContent, boards: [{ ...defaultAboutContent.boards[0], photos }] });
    await updateAboutContent(directory, { ...defaultAboutContent, boards: [{ ...defaultAboutContent.boards[0], photos: photos.slice(0, 1) }] });

    await expect(access(path.join(directory, "media", first.storedName))).resolves.toBeUndefined();
    await expect(access(path.join(directory, "media", second.storedName))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("removes replaced About uploads through the legacy workspace", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-legacy-cleanup-"));
    const upload = await storeUpload(path.join(directory, "media"), new File([
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ], "vorstand.png", { type: "image/png" }));
    await updateAboutContent(directory, {
      ...defaultAboutContent,
      boards: [{ ...defaultAboutContent.boards[0], photoId: upload.id, photoAlt: "Der aktuelle Bezirksvorstand" }],
    });
    await replaceEditorialContent(directory, { articles: [], documents: [], about: defaultAboutContent });
    await expect(access(path.join(directory, "media", upload.storedName))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects a bundled PDF when its public backing file is missing", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-bundled-"));
    const about = structuredClone(defaultAboutContent);
    about.documents[0] = { ...about.documents[0], bundledFile: "nicht-vorhanden.pdf" };
    await expect(updateAboutContent(directory, about)).rejects.toThrow("PDF wurde nicht gefunden");
  });

  it("canonicalizes a legacy second founding designation", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-relations-"));
    const normalized = await updateAboutContent(directory, {
      ...defaultAboutContent,
      bdks: [
        defaultAboutContent.bdks[0],
        { ...defaultAboutContent.bdks[0], id: "zweite-gruendung", founding: true },
      ],
    });
    expect(normalized.bdks.filter((bdk) => bdk.founding)).toHaveLength(1);
    expect(normalized.bdks.find((bdk) => bdk.id === "zweite-gruendung")?.founding).toBe(false);
  });


  it("derives document publication from its containing BDK", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-cross-fields-"));
    const normalized = await updateAboutContent(directory, {
      ...defaultAboutContent,
      documents: defaultAboutContent.documents.map((document, index) => index === 0 ? { ...document, status: "draft" as const } : document),
    });
    expect(normalized.documents[0].status).toBe("published");
  });

  it("requires a number for every Satzung", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-about-statute-number-"));
    await expect(updateAboutContent(directory, {
      ...defaultAboutContent,
      documents: defaultAboutContent.documents.map((document) => document.kind === "satzung" ? { ...document, number: "" } : document),
    })).rejects.toThrow("Satzungsnummer");
  });
});
