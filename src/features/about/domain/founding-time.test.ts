import { describe, expect, it } from "vitest";
import { elapsedSinceFounding } from "@/features/about/domain/founding-time";

describe("founding elapsed time", () => {
  it("returns calendar years, months, days and clock units", () => {
    expect(elapsedSinceFounding("2024-01-15", "10:30", new Date("2026-03-18T12:35:42+01:00"))).toEqual({
      years: 2,
      months: 2,
      days: 3,
      hours: 2,
      minutes: 5,
      seconds: 42,
    });
  });
});