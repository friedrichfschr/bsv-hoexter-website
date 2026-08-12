import { describe, expect, it } from "vitest";
import { submissionIncludesEvent, submissionRequiresPoster, validateSubmission } from "@/lib/submission";

const valid = {
  submissionKind: "event",
  title: "Test event",
  organizer: "Beispielorganisation",
  category: "Freizeit",
  website: "https://example.org/termin",
  date: "2026-11-08",
  location: "Höxter",
  ageRange: "14 bis 18 Jahre",
  contactName: "Max Mustermann",
  contactEmail: "max@example.org",
  description: "Ein Informationstag für Schülerinnen und Schüler aus dem Kreis Höxter.",
  consent: true,
};

describe("validateSubmission", () => {
  it("accepts and normalizes an event-only submission", () => {
    const result = validateSubmission({ ...valid, title: "  Test event  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe("Test event");
  });

  it("accepts poster-only submissions without event fields", () => {
    const result = validateSubmission({
      submissionKind: "poster",
      title: "Test poster",
      posterExpiresAt: "2026-11-08",
      contactEmail: "test@example.org",
      consent: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts combined poster and event submissions", () => {
    expect(validateSubmission({ ...valid, submissionKind: "both", posterExpiresAt: "2026-11-09" }).success).toBe(true);
  });

  it("requires a poster expiry date for poster and combined submissions", () => {
    expect(validateSubmission({ submissionKind: "poster", title: "Test poster", contactEmail: "test@example.org", consent: true }).success).toBe(false);
    expect(validateSubmission({ ...valid, submissionKind: "both", posterExpiresAt: "" }).success).toBe(false);
  });

  it("requires every event field for event and combined submissions", () => {
    for (const field of ["description", "date", "location", "ageRange", "website", "organizer", "category"] as const) {
      expect(validateSubmission({ ...valid, [field]: "" }).success, field).toBe(false);
    }
  });

  it("rejects invalid or non-HTTP website links", () => {
    expect(validateSubmission({ ...valid, website: "not-a-url" }).success).toBe(false);
    expect(validateSubmission({ ...valid, website: "javascript:alert(1)" }).success).toBe(false);
    expect(validateSubmission({ ...valid, website: "file:///etc/passwd" }).success).toBe(false);
  });

  it("requires the accuracy and contact consent", () => {
    const result = validateSubmission({ ...valid, consent: false });
    expect(result.success).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    expect(validateSubmission({ ...valid, date: "2026-99-99" }).success).toBe(false);
    expect(validateSubmission({ ...valid, date: "2026-02-30" }).success).toBe(false);
  });

  it("does not require a personal contact name", () => {
    const result = validateSubmission({ ...valid, contactName: "" });
    expect(result.success).toBe(true);
  });

  it("accepts only the moderated board categories", () => {
    expect(validateSubmission({ ...valid, category: "Hobbys" }).success).toBe(true);
    expect(validateSubmission({ ...valid, category: "Politik" }).success).toBe(false);
  });

  it("identifies which submission modes require event data or a poster", () => {
    expect(submissionRequiresPoster("poster")).toBe(true);
    expect(submissionRequiresPoster("event")).toBe(false);
    expect(submissionRequiresPoster("both")).toBe(true);
    expect(submissionIncludesEvent("poster")).toBe(false);
    expect(submissionIncludesEvent("event")).toBe(true);
    expect(submissionIncludesEvent("both")).toBe(true);
  });
});
