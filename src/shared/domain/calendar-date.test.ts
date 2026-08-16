import { describe, expect, it } from "vitest";
import { calendarDateSchema } from "@/shared/domain/calendar-date";

describe("calendarDateSchema", () => {
  it.each(["2024-02-29", "2026-12-31"])("accepts %s", (value) => {
    expect(calendarDateSchema.parse(value)).toBe(value);
  });

  it.each(["2023-02-29", "2026-02-30", "2026-13-01", "01.01.2026"])("rejects %s", (value) => {
    expect(() => calendarDateSchema.parse(value)).toThrow();
  });
});
