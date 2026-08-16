// @vitest-environment node
import { describe, expect, it } from "vitest";
import { bdkExportHeaders, bdkExportValues, generateBdkWorkbook } from "@/features/bdk/server/export";
import type { BdkSignupRecord } from "@/features/bdk/domain/state";

const record: BdkSignupRecord = {
  id: "22222222-2222-4222-8222-222222222222",
  eventId: "11111111-1111-4111-8111-111111111111",
  eventTitle: "BDK August",
  eventDate: "2026-08-20",
  firstName: "Erika",
  lastName: "Muster",
  grade: "other",
  gradeOther: "Ausbildung",
  email: "erika@example.org",
  school: "other",
  schoolOther: "Freie Schule",
  role: "guest",
  message: "Hallo",
  privacyAccepted: true,
  status: "cancelled",
  registeredAt: "2026-08-01T10:00:00.000Z",
  cancelledAt: "2026-08-02T10:00:00.000Z",
  confirmationSentAt: "",
  cancellationTokenHash: "",
};

describe("BDK XLSX export", () => {
  it("exports personal data in the documented column order", () => {
    expect(bdkExportHeaders).toEqual([
      "Status", "BDK", "BDK-Datum", "Vorname", "Nachname", "Jahrgangsstufe", "E-Mail", "Schule", "Teilnahmerolle", "Nachricht", "Angemeldet am", "Abgesagt am",
    ]);
    expect(bdkExportValues(record)).toEqual([
      "Abgesagt", "BDK August", "2026-08-20", "Erika", "Muster", "Ausbildung", "erika@example.org", "Freie Schule", "Gast", "Hallo", "2026-08-01T10:00:00.000Z", "2026-08-02T10:00:00.000Z",
    ]);
  });

  it("generates a real XLSX workbook", async () => {
    const workbook = await generateBdkWorkbook([record]);
    expect(workbook.subarray(0, 2).toString()).toBe("PK");
    expect(workbook.length).toBeGreaterThan(1000);
  });
});
