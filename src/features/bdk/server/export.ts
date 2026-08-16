import writeXlsxFile, { type SheetData } from "write-excel-file/node";
import { bdkRoleLabels } from "@/features/bdk/domain/signup";
import { bdkSchoolLabel } from "@/features/bdk/domain/schools";
import type { BdkSignupRecord } from "@/features/bdk/domain/state";

export const bdkExportHeaders = [
  "Status", "BDK", "BDK-Datum", "Vorname", "Nachname", "Jahrgangsstufe", "E-Mail", "Schule", "Teilnahmerolle", "Nachricht", "Angemeldet am", "Abgesagt am",
] as const;

export function bdkExportValues(record: BdkSignupRecord) {
  return [
    record.status === "cancelled" ? "Abgesagt" : "Aktiv",
    record.eventTitle,
    record.eventDate,
    record.firstName,
    record.lastName,
    record.grade === "other" ? record.gradeOther : record.grade,
    record.email,
    bdkSchoolLabel(record.school, record.schoolOther),
    bdkRoleLabels[record.role],
    record.message,
    record.registeredAt,
    record.cancelledAt,
  ];
}

function calendarDate(value: string) {
  return value ? new Date(`${value}T12:00:00Z`) : null;
}

function timestamp(value: string) {
  return value ? new Date(value) : null;
}

export async function generateBdkWorkbook(records: BdkSignupRecord[]) {
  const header = bdkExportHeaders.map((value) => ({ value, fontWeight: "bold" as const, backgroundColor: "#E5B829" }));
  const rows: SheetData = [header, ...records.map((record) => {
    const values = bdkExportValues(record);
    return values.map((value, index) => {
      if (index === 2) {
        const date = calendarDate(value);
        return date ? { value: date, type: Date, format: "dd.mm.yyyy" } : null;
      }
      if (index === 10 || index === 11) {
        const date = timestamp(value);
        return date ? { value: date, type: Date, format: "dd.mm.yyyy hh:mm" } : null;
      }
      return value;
    });
  })];
  return writeXlsxFile(rows, {
    sheet: "Anmeldungen",
    stickyRowsCount: 1,
    columns: [12, 24, 14, 18, 18, 18, 30, 34, 25, 38, 21, 21].map((width) => ({ width })),
  }).toBuffer();
}
