import { describe, expect, it } from "vitest";
import { bdkEventSchema, createPreparedBdkEvent, selectPublicBdkEvent } from "@/features/bdk/domain/event";

const now = new Date("2026-08-16T12:00:00Z");

describe("BDK event lifecycle", () => {
  it("creates a prepared event with an immutable opaque ID and no inherited documents", () => {
    const event = createPreparedBdkEvent(now);
    expect(bdkEventSchema.parse(event)).toEqual(event);
    expect(event).toMatchObject({ date: "", invitationId: "", delegateKeyId: "" });
    expect(event.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("exposes a prepared event before a date is set", () => {
    const event = createPreparedBdkEvent(now);
    expect(selectPublicBdkEvent(event, "2026-08-16")?.id).toBe(event.id);
  });

  it("exposes a dated event through its calendar date", () => {
    const event = { ...createPreparedBdkEvent(now), date: "2026-08-16" };
    expect(selectPublicBdkEvent(event, "2026-08-16")?.id).toBe(event.id);
  });

  it("hides a passed event until a new one is prepared", () => {
    const event = { ...createPreparedBdkEvent(now), date: "2026-08-15" };
    expect(selectPublicBdkEvent(event, "2026-08-16")).toBeUndefined();
  });

  it("rejects impossible dates and invalid upload identifiers", () => {
    const event = createPreparedBdkEvent(now);
    expect(bdkEventSchema.safeParse({ ...event, date: "2026-02-30" }).success).toBe(false);
    expect(bdkEventSchema.safeParse({ ...event, invitationId: "../secret" }).success).toBe(false);
  });
});
