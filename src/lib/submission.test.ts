import { describe, expect, it } from "vitest";
import { validateSubmission } from "@/lib/submission";

const valid = {
  title: "Test event",
  organizer: "Beispielorganisation",
  category: "Freizeit",
  sourceUrl: "https://example.org/termin",
  flyerUrl: "https://example.org/flyer.pdf",
  date: "2026-11-08",
  location: "Höxter",
  ageRange: "14 bis 18 Jahre",
  contactName: "Max Mustermann",
  contactEmail: "max@example.org",
  description: "Ein Informationstag für Schülerinnen und Schüler aus dem Kreis Höxter.",
  consent: true,
};

describe("validateSubmission", () => {
  it("accepts and normalizes a complete submission", () => {
    const result = validateSubmission({ ...valid, title: "  Test event  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe("Test event");
  });

  it("rejects invalid or non-HTTP source links", () => {
    expect(validateSubmission({ ...valid, sourceUrl: "not-a-url" }).success).toBe(false);
    expect(validateSubmission({ ...valid, sourceUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(validateSubmission({ ...valid, sourceUrl: "file:///etc/passwd" }).success).toBe(false);
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
    expect(validateSubmission({ ...valid, category: "Hobbies" }).success).toBe(true);
    expect(validateSubmission({ ...valid, category: "Politik" }).success).toBe(false);
  });
});
