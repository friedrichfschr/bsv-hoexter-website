import { z } from "zod";

export const bdkParticipationRoles = ["student-council", "delegate", "interested"] as const;

export const bdkSignupSchema = z.object({
  name: z.string().trim().min(2, "Bitte deinen Namen eingeben.").max(100),
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben.").max(200),
  school: z.string().trim().min(2, "Bitte deine Schule eingeben.").max(150),
  role: z.enum(bdkParticipationRoles, { error: "Bitte auswählen, wie du teilnehmen möchtest." }),
  note: z.string().trim().max(1500).optional().default(""),
  consent: z.literal(true, { error: "Bitte die Kontaktaufnahme und Datenverarbeitung bestätigen." }),
});

export type BdkSignup = z.infer<typeof bdkSignupSchema>;

export function validateBdkSignup(input: unknown) {
  return bdkSignupSchema.safeParse(input);
}
