import { describe, expect, it } from "vitest";
import { noticeBoardCapacity, noticeBoards } from "./notice-board";

describe("notice board poster layout", () => {
  it("provides poster placement data for each board", () => {
    expect(noticeBoards).toHaveLength(2);
    expect(noticeBoards.every((board) => board.posters.length > 0)).toBe(true);
  });

  it("reserves capacity for roughly ten to fifteen posters", () => {
    expect(noticeBoardCapacity).toEqual({ minimum: 10, maximum: 15 });
    expect(noticeBoards.flatMap((board) => board.posters)).toHaveLength(4);
  });

  it("uses the supplied poster placeholder assets", () => {
    expect(noticeBoards.flatMap((board) => board.posters).map((poster) => poster.src)).toEqual([
      "/notice-board/posters/music-festival.webp",
      "/notice-board/posters/mint-camps.webp",
      "/notice-board/posters/mathematics-olympiad.webp",
      "/notice-board/posters/graduation-party.webp",
    ]);
  });

  it("keeps placeholder posters within the board canvas", () => {
    for (const board of noticeBoards) {
      for (const poster of board.posters) {
        expect(poster.left).toBeGreaterThanOrEqual(0);
        expect(poster.top).toBeGreaterThanOrEqual(0);
        expect(poster.left + poster.width).toBeLessThanOrEqual(100);
        expect(poster.top + poster.height).toBeLessThanOrEqual(100);
        expect(poster.width).toBeGreaterThan(0);
        expect(poster.height).toBeGreaterThan(0);
      }
    }
  });
});
