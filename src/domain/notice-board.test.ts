import { describe, expect, it } from "vitest";
import { noticeBoardCapacity, noticeBoards } from "./notice-board";

describe("notice board layout", () => {
  it("provides the two board canvases without hard-coded posters", () => {
    expect(noticeBoards).toEqual([{ id: "left" }, { id: "right" }]);
  });

  it("reserves capacity for roughly ten to fifteen moderated posters", () => {
    expect(noticeBoardCapacity).toEqual({ minimum: 10, maximum: 15 });
  });
});
