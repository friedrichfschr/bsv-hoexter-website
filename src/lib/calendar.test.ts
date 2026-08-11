import { describe, expect, it } from "vitest";
import { createEventCalendar } from "@/lib/calendar";
import type { BsvEvent } from "@/domain/events";

const fixture: BsvEvent = {
  slug: "test-event",
  title: "Test event",
  summary: "A test-only summary.",
  description: ["Test-only description."],
  category: "Hobbies",
  start: "2099-01-10T10:00:00",
  end: "2099-01-10T11:00:00",
  dateLabel: "10 January 2099",
  location: "Test venue",
  city: "Test city",
  target: "Test audience",
  ageRange: "Test range",
  price: "Test price",
  organizer: "Test organizer",
  sourceName: "Test source",
  sourceUrl: "https://example.test/event",
  checkedAt: "2099-01-01",
};

describe("createEventCalendar", () => {
  it("serializes a constructed event as a folded RFC-compatible calendar", () => {
    const value = createEventCalendar(fixture, new Date("2099-01-01T12:00:00Z"));
    expect(value).toContain("BEGIN:VCALENDAR");
    expect(value).toContain("BEGIN:VEVENT");
    expect(value).toContain("SUMMARY:Test event");
    expect(value).toContain("END:VCALENDAR");
    for (const line of value.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
  });
});
