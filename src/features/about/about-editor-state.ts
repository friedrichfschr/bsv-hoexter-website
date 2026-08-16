import type { AboutContent } from "@/features/about/domain/content-schema";

export type AboutCollection = "boards" | "bdks" | "documents" | "media";

export const emptyBoard: AboutContent["boards"][number] = {
  id: "",
  term: "",
  startDate: "",
  endDate: "",
  message: "",
  photoId: "",
  photoAlt: "",
  photos: [],
  status: "published",
};

export const emptyBdk: AboutContent["bdks"][number] = {
  id: "",
  title: "",
  subtitle: "",
  date: "",
  time: "",
  location: "",
  summary: "",
  documentIds: [],
  photoIds: [],
  links: [],
  status: "published",
  founding: false,
};

export const emptyDocument: AboutContent["documents"][number] = {
  id: "",
  title: "",
  kind: "sonstiges",
  date: "",
  number: "",
  effectiveFrom: "",
  effectiveUntil: "",
  status: "published",
  mediaId: "",
  bundledFile: "",
  fileName: "",
};

export function updateCollectionItem<K extends AboutCollection>(
  about: AboutContent,
  collection: K,
  index: number,
  value: AboutContent[K][number],
): AboutContent {
  const values = [...about[collection]] as AboutContent[K];
  values[index] = value;
  return { ...about, [collection]: values };
}

export function selectActiveBoard(about: AboutContent, id: string): AboutContent {
  const active = about.boards.find((board) => board.id === id);
  return {
    ...about,
    activeBoardId: id,
    boards: active ? [active, ...about.boards.filter((board) => board.id !== id)] : about.boards,
  };
}

export function updateBoardId(about: AboutContent, index: number, id: string): AboutContent {
  const previousId = about.boards[index].id;
  const boards = [...about.boards];
  boards[index] = { ...boards[index], id };
  return {
    ...about,
    activeBoardId: about.activeBoardId === previousId ? id : about.activeBoardId,
    boards,
  };
}

export function withBoardPhotos(
  board: AboutContent["boards"][number],
  photos: AboutContent["boards"][number]["photos"],
): AboutContent["boards"][number] {
  return { ...board, photos, photoId: photos[0]?.id ?? "", photoAlt: photos[0]?.alt ?? "" };
}

export function appendStatute(about: AboutContent): AboutContent {
  let number = about.documents.length + 1;
  while (about.documents.some((document) => document.id === `satzung-${number}`)) number += 1;
  return {
    ...about,
    documents: [
      ...about.documents,
      { ...emptyDocument, id: `satzung-${number}`, kind: "satzung", status: "published" },
    ],
  };
}
