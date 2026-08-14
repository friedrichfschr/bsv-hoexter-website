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

function todayInBerlin() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
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

function referencedUploadIds(about: AboutContent) {
  return new Set([
    ...about.boards.flatMap((board) => board.photos.map((photo) => photo.id)),
    ...about.documents.map((document) => document.mediaId),
    ...about.media.map((media) => media.mediaId),
  ].filter(Boolean));
}

function previousIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day - 1));
  return date.toISOString().slice(0, 10);
}

function chronologicalBoards(boards: AboutContent["boards"]) {
  const ascending = [...boards].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return ascending.map((board, index) => ({
    ...board,
    endDate: ascending[index + 1] ? previousIsoDate(ascending[index + 1].startDate) : "",
    status: "published" as const,
  })).reverse();
}

function chronologicalStatutes(documents: AboutContent["documents"]) {
  const ascending = documents.filter((document) => document.kind === "satzung").sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return ascending.map((document, index) => ({
    ...document,
    effectiveUntil: ascending[index + 1] ? previousIsoDate(ascending[index + 1].effectiveFrom) : "",
    status: "published" as const,
  })).reverse();
}

export function normalizeAboutEditorialContent(about: AboutContent) {
  const defaultFounding = defaultAboutContent.bdks.find((bdk) => bdk.founding)!;
  const submittedFounding = about.bdks.find((bdk) => bdk.id === defaultFounding.id);
  const statuteIds = new Set(about.documents.filter((document) => document.kind === "satzung").map((document) => document.id));

  const bdks = [
    { ...defaultFounding, documentIds: (submittedFounding?.documentIds ?? []).filter((id) => !statuteIds.has(id)) },
    ...about.bdks.filter((bdk) => bdk.id !== defaultFounding.id).map((bdk) => ({ ...bdk, founding: false, photoIds: [], status: "published" as const })),
  ];
  const publishedDocumentIds = new Set(bdks.filter((bdk) => bdk.status === "published").flatMap((bdk) => bdk.documentIds));

  const documents = [
    ...chronologicalStatutes(about.documents),
    ...about.documents.filter((document) => document.kind !== "satzung").map((document) => ({
      ...document,
      status: publishedDocumentIds.has(document.id) ? "published" as const : "draft" as const,
    })),
  ];
  return aboutContentSchema.parse({
    ...about,
    boards: chronologicalBoards(about.boards),
    bdks,
    documents,
    media: defaultAboutContent.media.map((media) => ({ ...media })),
  });
}

export async function cleanupRemovedAboutUploads(directory: string, previous: AboutContent, next: AboutContent, retainedIds: Iterable<string> = []) {
  const nextIds = referencedUploadIds(next);
  for (const id of retainedIds) if (id) nextIds.add(id);
  for (const id of referencedUploadIds(previous)) {
    if (nextIds.has(id)) continue;
    const upload = await readStoredUpload(path.join(directory, "media"), id);
    if (upload) await removeStoredUpload(path.join(directory, "media"), upload);
  }
}

export async function validateAboutContent(directory: string, about: AboutContent) {
  assertUniqueIds(about.boards, "Bezirksvorstände");
  assertUniqueIds(about.bdks, "BDKs");
  assertUniqueIds(about.documents, "Dokumente");
  assertUniqueIds(about.media, "Bilder");
  const documentIds = new Set(about.documents.map((document) => document.id));
  const publishedDocumentIds = new Set(about.documents.filter((document) => document.status === "published").map((document) => document.id));
  const mediaIds = new Set(about.media.map((media) => media.id));
  const publishedMediaIds = new Set(about.media.filter((media) => media.status === "published").map((media) => media.id));
  for (const board of about.boards) {
    if (board.endDate && board.endDate < board.startDate) throw new Error("Das Ende der Amtszeit darf nicht vor ihrem Beginn liegen.");
    if (new Set(board.photos.map((photo) => photo.id)).size !== board.photos.length) throw new Error("Ein Vorstandsfoto ist mehrfach zugeordnet.");
  }
  const activeBoard = about.boards.find((board) => board.id === about.activeBoardId);
  if (!activeBoard) throw new Error("Aktiver Bezirksvorstand: Bitte genau einen vorhandenen Vorstand auswählen.");
  const today = todayInBerlin();
  if (activeBoard.startDate > today || (activeBoard.endDate && activeBoard.endDate < today)) throw new Error("Die Amtszeit des aktiven Bezirksvorstands muss heute gültig sein.");
  if (about.bdks.filter((bdk) => bdk.status === "published" && bdk.founding).length > 1) throw new Error("Es darf nur eine Gründungs-BDK geben.");
  for (const bdk of about.bdks) {
    if (new Set(bdk.documentIds).size !== bdk.documentIds.length) throw new Error("Ein BDK-Dokument ist mehrfach zugeordnet.");
    if (bdk.documentIds.some((id) => !documentIds.has(id))) throw new Error("Ein BDK-Dokument wurde nicht gefunden.");
    if (bdk.status === "published" && bdk.documentIds.some((id) => !publishedDocumentIds.has(id))) throw new Error("Eine veröffentlichte BDK darf nur veröffentlichte Dokumente enthalten.");
    if (new Set(bdk.photoIds).size !== bdk.photoIds.length) throw new Error("Ein BDK-Bild ist mehrfach zugeordnet.");
    if (bdk.photoIds.some((id) => !mediaIds.has(id))) throw new Error("Ein BDK-Bild wurde nicht gefunden.");
    if (bdk.status === "published" && bdk.photoIds.some((id) => !publishedMediaIds.has(id))) throw new Error("Eine veröffentlichte BDK darf nur veröffentlichte Bilder enthalten.");
  }
  for (const document of about.documents) {
    if (document.kind === "satzung" && !document.number) throw new Error("Bitte für jede Satzung eine Satzungsnummer angeben.");
    if (Boolean(document.mediaId) === Boolean(document.bundledFile)) throw new Error("Jedes Dokument benötigt genau eine gespeicherte Datei.");
    if (document.bundledFile && !(await fileExists(path.join(process.cwd(), "content", "about-documents", document.bundledFile)))) throw new Error("Das ausgewählte PDF wurde nicht gefunden.");
    if (document.mediaId) {
      const upload = await readStoredUpload(path.join(directory, "media"), document.mediaId);
      if (!upload || upload.mediaType !== "application/pdf" || !(await uploadPayloadExists(path.join(directory, "media"), upload))) throw new Error("Das ausgewählte PDF wurde nicht gefunden.");
    }
    if (document.effectiveUntil && document.effectiveUntil < document.effectiveFrom) throw new Error("Der Gültigkeitszeitraum eines Dokuments ist ungültig.");
  }
  const statutes = about.documents.filter((document) => document.kind === "satzung" && document.status === "published").sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  for (let index = 1; index < statutes.length; index += 1) {
    const previous = statutes[index - 1];
    const current = statutes[index];
    if (!previous.effectiveUntil || previous.effectiveUntil >= current.effectiveFrom) throw new Error("Veröffentlichte Satzungen dürfen keine überlappenden Gültigkeitszeiträume haben.");
  }
  for (const media of about.media) {
    if (Boolean(media.mediaId) === Boolean(media.bundledFile)) throw new Error("Jedes Bild benötigt genau eine gespeicherte Datei.");
    if (media.bundledFile && !(await fileExists(path.join(process.cwd(), "content", "about-images", media.bundledFile)))) throw new Error("Das ausgewählte Bild wurde nicht gefunden.");
    if (media.mediaId) {
      const upload = await readStoredUpload(path.join(directory, "media"), media.mediaId);
      if (!upload || !upload.mediaType.startsWith("image/") || !(await uploadPayloadExists(path.join(directory, "media"), upload))) throw new Error("Das ausgewählte Bild wurde nicht gefunden.");
    }
  }
  for (const board of about.boards) {
    for (const photo of board.photos) {
      const upload = await readStoredUpload(path.join(directory, "media"), photo.id);
      if (!upload || !upload.mediaType.startsWith("image/") || !(await uploadPayloadExists(path.join(directory, "media"), upload))) throw new Error("Das ausgewählte Vorstandsfoto wurde nicht gefunden.");
      if (board.status === "published" && !photo.alt) throw new Error("Bitte für jedes Vorstandsfoto einen Alternativtext angeben.");
    }
  }
}

export async function updateAboutContent(directory = resolveEditorialDirectory(), input: unknown) {
  const about = normalizeAboutEditorialContent(aboutContentSchema.parse(input));
  return mutateEditorialContent(directory, async (content) => {
    await validateAboutContent(directory, about);
    return {
      content: { ...content, about },
      result: about,
      afterWrite: () => cleanupRemovedAboutUploads(directory, content.about, about, [
        ...content.articles.map((article) => article.imageId),
        ...content.documents.map((document) => document.mediaId),
      ]),
    };
  });
}

export function publishedAboutContent(content: EditorialContent, today = todayInBerlin()) {
  const about = normalizeAboutEditorialContent(aboutContentSchema.parse(content.about ?? defaultAboutContent));
  const documents = about.documents.filter((document) => document.status === "published").sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const documentIds = new Set(documents.map((document) => document.id));
  const boards = about.boards.filter((board) => board.status === "published" && board.startDate <= today).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const bdks = about.bdks.filter((bdk) => bdk.status === "published").map((bdk) => ({ ...bdk, documentIds: bdk.documentIds.filter((id) => documentIds.has(id)) })).sort((a, b) => b.date.localeCompare(a.date));
  const statutes = documents.filter((document) => document.kind === "satzung");
  const currentBoard = boards.find((board) => board.id === about.activeBoardId);
  const effectiveStatutes = statutes.filter((document) => document.effectiveFrom <= today && (!document.effectiveUntil || document.effectiveUntil >= today));
  const previousStatutes = statutes.filter((document) => document.effectiveUntil && document.effectiveUntil < today);
  const foundingBdk = bdks.find((bdk) => bdk.founding && bdk.date <= today);
  const visibleMediaIds = new Set([
    ...boards.flatMap((board) => board.photos.map((photo) => photo.id)),
    ...bdks.filter((bdk) => bdk.date <= today).flatMap((bdk) => bdk.photoIds),
  ].filter(Boolean));
  const media = about.media.filter((item) => item.status === "published" && visibleMediaIds.has(item.id));
  return {
    intro: about.intro,
    values: about.values,
    boards,
    bdks,
    documents,
    media,
    currentBoard,
    previousBoards: boards.filter((board) => board.id !== currentBoard?.id && board.startDate <= today),
    currentStatute: effectiveStatutes[0],
    previousStatutes,
    foundingBdk,
  };
}

export { defaultAboutContent, readEditorialContent };
