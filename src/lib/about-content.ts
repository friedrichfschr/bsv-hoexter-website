import { access } from "node:fs/promises";
import path from "node:path";
import { aboutContentSchema, defaultAboutContent, type AboutContent } from "@/lib/about-schema";
import { mutateEditorialContent, readEditorialContent, resolveEditorialDirectory, type EditorialContent } from "@/lib/editorial";
import { readStoredUpload, removeStoredUpload } from "@/lib/uploads";

function assertUniqueIds(records: { id: string }[], label: string) {
  const ids = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id)) throw new Error(`${label}: ID ist mehrfach vergeben.`);
    ids.add(record.id);
  }
}

async function uploadPayloadExists(directory: string, upload: NonNullable<Awaited<ReturnType<typeof readStoredUpload>>>) {
  try {
    await access(path.join(directory, upload.storedName));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export async function validateAboutContent(directory: string, about: AboutContent) {
  assertUniqueIds(about.boards, "Bezirksvorstände");
  assertUniqueIds(about.bdks, "BDKs");
  assertUniqueIds(about.documents, "Dokumente");
  const documentIds = new Set(about.documents.map((document) => document.id));
  const publishedDocumentIds = new Set(about.documents.filter((document) => document.status === "published").map((document) => document.id));
  if (about.boards.filter((board) => board.status === "published" && !board.endDate).length > 1) throw new Error("Es darf nur einen aktuellen Bezirksvorstand geben.");
  if (about.bdks.filter((bdk) => bdk.status === "published" && bdk.founding).length > 1) throw new Error("Es darf nur eine Gründungs-BDK geben.");
  const publishedBoards = about.boards.filter((board) => board.status === "published").sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (let index = 1; index < publishedBoards.length; index += 1) {
    const previous = publishedBoards[index - 1];
    const current = publishedBoards[index];
    if (!previous.endDate || previous.endDate >= current.startDate) throw new Error("Veröffentlichte Amtszeiten dürfen sich nicht überschneiden.");
  }
  for (const bdk of about.bdks) {
    if (new Set(bdk.documentIds).size !== bdk.documentIds.length) throw new Error("Ein BDK-Dokument ist mehrfach zugeordnet.");
    if (bdk.documentIds.some((id) => !documentIds.has(id))) throw new Error("Ein BDK-Dokument wurde nicht gefunden.");
    if (bdk.status === "published" && bdk.documentIds.some((id) => !publishedDocumentIds.has(id))) throw new Error("Eine veröffentlichte BDK darf nur veröffentlichte Dokumente enthalten.");
  }
  for (const document of about.documents) {
    if (Boolean(document.mediaId) === Boolean(document.bundledFile)) throw new Error("Jedes Dokument benötigt genau eine gespeicherte Datei.");
    if (document.bundledFile && !(await fileExists(path.join(process.cwd(), "content", "about-documents", document.bundledFile)))) throw new Error("Das ausgewählte PDF wurde nicht gefunden.");
    if (document.mediaId) {
      const upload = await readStoredUpload(path.join(directory, "media"), document.mediaId);
      if (!upload || upload.mediaType !== "application/pdf" || !(await uploadPayloadExists(path.join(directory, "media"), upload))) throw new Error("Das ausgewählte PDF wurde nicht gefunden.");
    }
  }
  for (const board of about.boards) {
    if (board.endDate && board.endDate < board.startDate) throw new Error("Das Ende der Amtszeit darf nicht vor ihrem Beginn liegen.");
    if (!board.photoId) continue;
    const upload = await readStoredUpload(path.join(directory, "media"), board.photoId);
    if (!upload || !upload.mediaType.startsWith("image/") || !(await uploadPayloadExists(path.join(directory, "media"), upload))) throw new Error("Das ausgewählte Vorstandsfoto wurde nicht gefunden.");
    if (board.status === "published" && !board.photoAlt) throw new Error("Bitte einen Alternativtext für das Vorstandsfoto angeben.");
  }
}

export async function updateAboutContent(directory = resolveEditorialDirectory(), input: unknown) {
  const about = aboutContentSchema.parse(input);
  return mutateEditorialContent(directory, async (content) => {
    await validateAboutContent(directory, about);
    const previousIds = new Set([
      ...content.about.boards.map((board) => board.photoId),
      ...content.about.documents.map((document) => document.mediaId),
    ].filter(Boolean));
    const nextIds = new Set([
      ...about.boards.map((board) => board.photoId),
      ...about.documents.map((document) => document.mediaId),
    ].filter(Boolean));
    const removedIds = [...previousIds].filter((id) => !nextIds.has(id));
    return {
      content: { ...content, about },
      result: about,
      afterWrite: async () => {
        for (const id of removedIds) {
          const upload = await readStoredUpload(path.join(directory, "media"), id);
          if (upload) await removeStoredUpload(path.join(directory, "media"), upload);
        }
      },
    };
  });
}

export function publishedAboutContent(content: EditorialContent, today = new Date().toISOString().slice(0, 10)) {
  const about = aboutContentSchema.parse(content.about ?? defaultAboutContent);
  const documents = about.documents.filter((document) => document.status === "published").sort((a, b) => b.date.localeCompare(a.date));
  const documentIds = new Set(documents.map((document) => document.id));
  const boards = about.boards.filter((board) => board.status === "published").sort((a, b) => b.startDate.localeCompare(a.startDate));
  const bdks = about.bdks.filter((bdk) => bdk.status === "published").map((bdk) => ({ ...bdk, documentIds: bdk.documentIds.filter((id) => documentIds.has(id)) })).sort((a, b) => b.date.localeCompare(a.date));
  const statutes = documents.filter((document) => document.kind === "satzung");
  const currentBoard = boards.find((board) => board.startDate <= today && (!board.endDate || board.endDate >= today));
  const effectiveStatutes = statutes.filter((document) => document.date <= today);
  return {
    intro: about.intro,
    values: about.values,
    boards,
    bdks,
    documents,
    currentBoard,
    previousBoards: boards.filter((board) => board.id !== currentBoard?.id && board.startDate <= today),
    currentStatute: effectiveStatutes[0],
    previousStatutes: effectiveStatutes.slice(1),
    foundingBdk: bdks.find((bdk) => bdk.founding),
  };
}

export { defaultAboutContent, readEditorialContent };
