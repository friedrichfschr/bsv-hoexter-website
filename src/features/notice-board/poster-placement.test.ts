import { describe, expect, it } from "vitest";
import { roundPosterPlacement, isActivePoster } from "@/features/notice-board/poster-placement";

describe("poster placement helpers", () => {
  it("rounds pointer-derived placement values to one decimal place", () => {
    expect(roundPosterPlacement({
      boardId: "left",
      left: 12.34567,
      top: 23.45678,
      width: 34.56789,
      height: 45.67891,
      rotation: 1.234,
    })).toEqual({ boardId: "left", left: 12.3, top: 23.5, width: 34.6, height: 45.7, rotation: 1.2 });
  });

  it("shows only approved, placed, unexpired posters as active", () => {
    const base = { status: "approved", expiresAt: "2026-11-09", placement: { boardId: "left" } };
    expect(isActivePoster(base, "2026-11-08")).toBe(true);
    expect(isActivePoster({ ...base, expiresAt: "2026-11-08" }, "2026-11-08")).toBe(false);
    expect(isActivePoster({ ...base, status: "pending" }, "2026-11-08")).toBe(false);
    expect(isActivePoster({ ...base, placement: undefined }, "2026-11-08")).toBe(false);
  });
});