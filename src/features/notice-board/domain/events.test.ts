import { describe, expect, it } from "vitest";
import { filterEvents, type BsvEvent } from "@/features/notice-board/domain/events";

function fixture(overrides: Partial<BsvEvent> = {}): BsvEvent {
  return {
    slug: "test-event",
    title: "Test event",
    summary: "A test-only summary.",
    description: ["Test-only description."],
    category: "Hobbys",
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
    ...overrides,
  };
}

describe("filterEvents", () => {
  it("filters constructed records by query, category, and location", () => {
    const records = [fixture(), fixture({ slug: "other", title: "Other", category: "Freizeit", city: "Elsewhere" })];
    expect(filterEvents(records, { query: "test event", category: "Hobbys", location: "Test city" }).map((event) => event.slug)).toEqual(["test-event"]);
  });

  it("sorts current records chronologically and excludes expired records", () => {
    const records = [
      fixture({ slug: "later", start: "2099-01-12T10:00:00", end: "2099-01-12T11:00:00" }),
      fixture({ slug: "expired", start: "2000-01-01T10:00:00", end: "2000-01-01T11:00:00" }),
      fixture({ slug: "earlier" }),
    ];
    expect(filterEvents(records, { query: "", category: "Alle", location: "Alle" }).map((event) => event.slug)).toEqual(["earlier", "later"]);
  });
});
