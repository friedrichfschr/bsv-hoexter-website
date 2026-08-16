import { describe, expect, it } from "vitest";
import { bdkEventDetails, berlinCalendarDate } from "@/features/bdk/domain/presentation";
import { createPreparedBdkEvent } from "@/features/bdk/domain/event";

describe("BDK public presentation", () => {
  it("uses the Berlin calendar date for public eligibility", () => {
    expect(berlinCalendarDate(new Date("2026-08-16T22:30:00Z"))).toBe("2026-08-17");
  });

  it("describes an undated prepared event honestly", () => {
    expect(bdkEventDetails(createPreparedBdkEvent(new Date("2026-08-16T10:00:00Z")))).toEqual({
      date: "Termin wird noch bekannt gegeben",
      time: "",
      location: "",
    });
  });

  it("formats date, time, and place", () => {
    const event = { ...createPreparedBdkEvent(), date: "2026-09-08", time: "14:30", location: "Kreishaus Höxter" };
    expect(bdkEventDetails(event)).toEqual({ date: "Dienstag, 8. September 2026", time: "14:30 Uhr", location: "Kreishaus Höxter" });
  });
});
