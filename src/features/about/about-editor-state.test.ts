import { describe, expect, it } from "vitest";
import { defaultAboutContent } from "@/features/about/domain/content-schema";
import {
  appendStatute,
  selectActiveBoard,
  updateBoardId,
  updateCollectionItem,
  withBoardPhotos,
} from "@/features/about/about-editor-state";

describe("about editor state", () => {
  it("updates a collection item without mutating the previous state", () => {
    const about = structuredClone(defaultAboutContent);
    const previousBoard = about.boards[0];
    const nextBoard = { ...previousBoard, term: "2028–2030" };

    const next = updateCollectionItem(about, "boards", 0, nextBoard);

    expect(next).not.toBe(about);
    expect(next.boards).not.toBe(about.boards);
    expect(next.boards[0]).toBe(nextBoard);
    expect(about.boards[0]).toBe(previousBoard);
  });

  it("moves the selected active board first without mutating the board list", () => {
    const about = structuredClone(defaultAboutContent);
    const archived = { ...about.boards[0], id: "vorstand-2024", term: "2024–2026" };
    about.boards = [about.boards[0], archived];
    const previousBoards = about.boards;

    const next = selectActiveBoard(about, archived.id);

    expect(next.activeBoardId).toBe(archived.id);
    expect(next.boards.map((board) => board.id)).toEqual([archived.id, about.boards[0].id]);
    expect(about.boards).toBe(previousBoards);
  });

  it("keeps the active board reference aligned when its id changes", () => {
    const about = structuredClone(defaultAboutContent);

    const next = updateBoardId(about, 0, "vorstand-neu");

    expect(next.activeBoardId).toBe("vorstand-neu");
    expect(next.boards[0].id).toBe("vorstand-neu");
    expect(about.boards[0].id).not.toBe("vorstand-neu");
  });

  it("synchronizes legacy photo fields with immutable board photos", () => {
    const board = structuredClone(defaultAboutContent.boards[0]);
    const photos = [{ id: "neues-foto", alt: "Neuer Vorstand" }];

    const next = withBoardPhotos(board, photos);

    expect(next).toMatchObject({ photoId: "neues-foto", photoAlt: "Neuer Vorstand", photos });
    expect(next).not.toBe(board);
    expect(board.photos).not.toBe(photos);
  });

  it("appends a statute with the next unused generated id", () => {
    const about = structuredClone(defaultAboutContent);
    about.documents.push({ ...about.documents[0], id: `satzung-${about.documents.length + 1}` });

    const next = appendStatute(about);
    const statute = next.documents.at(-1);

    expect(statute).toMatchObject({ id: `satzung-${about.documents.length + 1}`, kind: "satzung", status: "published" });
    expect(next.documents).not.toBe(about.documents);
  });
});
