import { z } from "zod";
import { bdkSchoolIds } from "@/features/bdk/domain/schools";

export const bdkGrades = ["5", "6", "7", "8", "9", "10", "EF", "Q1", "Q2", "other"] as const;
export const bdkParticipationRoles = ["district-delegate", "school-sv", "guest", "lsv-member", "other-bsv-member"] as const;

export const bdkRoleLabels: Record<(typeof bdkParticipationRoles)[number], string> = {
  "district-delegate": "Bezirksdelegierte*r",
  "school-sv": "Schul-SV-Mitglied",
  guest: "Gast",
  "lsv-member": "LSV-Mitglied",
  "other-bsv-member": "Mitglied einer anderen BSV",
};

const schoolIds = [...bdkSchoolIds, "other"] as [string, ...string[]];

export const bdkSignupSchema = z.object({
  firstName: z.string().trim().min(1, "Bitte deinen Vornamen eingeben.").max(80),
  lastName: z.string().trim().min(1, "Bitte deinen Nachnamen eingeben.").max(80),
  grade: z.enum(bdkGrades, { error: "Bitte deine Jahrgangsstufe auswählen." }),
  gradeOther: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().toLowerCase().email("Bitte eine gültige E-Mail-Adresse eingeben.").max(200),
  school: z.enum(schoolIds, { error: "Bitte deine Schule auswählen." }),
  schoolOther: z.string().trim().max(180).optional().default(""),
  role: z.enum(bdkParticipationRoles, { error: "Bitte auswählen, wie du teilnimmst." }),
  message: z.string().trim().max(1500).optional().default(""),
  privacyAccepted: z.literal(true, { error: "Bitte die Datenschutzhinweise bestätigen." }),
}).superRefine((value, context) => {
  if (value.school === "other" && value.schoolOther.length < 2) {
    context.addIssue({ code: "custom", path: ["schoolOther"], message: "Bitte den Namen deiner Schule eingeben." });
  }
  if (value.grade === "other" && value.gradeOther.length < 1) {
    context.addIssue({ code: "custom", path: ["gradeOther"], message: "Bitte deine Jahrgangsstufe eingeben." });
  }
});

export type BdkSignupInput = z.infer<typeof bdkSignupSchema>;

export function validateBdkSignup(input: unknown) {
  return bdkSignupSchema.safeParse(input);
}
