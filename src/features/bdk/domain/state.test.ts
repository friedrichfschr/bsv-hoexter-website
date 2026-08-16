import { describe, expect, it } from "vitest";
import { createPreparedBdkEvent } from "@/features/bdk/domain/event";
import { bdkSignupRecordSchema, bdkStateSchema } from "@/features/bdk/domain/state";

const record = {
  id: "22222222-2222-4222-8222-222222222222",
  eventId: "11111111-1111-4111-8111-111111111111",
  eventTitle: "BDK Test",
  eventDate: "2026-08-20",
  firstName: "Erika",
  lastName: "Muster",
  grade: "Q1",
  gradeOther: "",
  email: "erika@example.org",
  school: "schulen-der-brede-brakel",
  schoolOther: "",
  role: "district-delegate",
  message: "",
  privacyAccepted: true,
  status: "active",
  registeredAt: "2026-08-01T10:00:00.000Z",
  cancelledAt: "",
  confirmationSentAt: "",
  cancellationTokenHash: "",
};

describe("BDK persisted state", () => {
  it("accepts blank or semantic event-date snapshots only", () => {
    expect(bdkSignupRecordSchema.safeParse(record).success).toBe(true);
    expect(bdkSignupRecordSchema.safeParse({ ...record, eventDate: "" }).success).toBe(true);
    expect(bdkSignupRecordSchema.safeParse({ ...record, eventDate: "2026-02-30" }).success).toBe(false);
  });

  it("rejects duplicate record IDs and active email/event pairs from disk", () => {
    const event = createPreparedBdkEvent(new Date("2026-08-01T10:00:00Z"), record.eventId);
    expect(bdkStateSchema.safeParse({ event, signups: [record, { ...record }] }).success).toBe(false);
    expect(bdkStateSchema.safeParse({
      event,
      signups: [record, { ...record, id: "33333333-3333-4333-8333-333333333333" }],
    }).success).toBe(false);
  });
});
