import { z } from "zod";

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein gültiges Datum wählen.").refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}, "Bitte ein gültiges Datum wählen.");

export const submissionSchema = z.object({
  title: z.string().trim().min(4, "Bitte einen aussagekräftigen Titel eingeben.").max(120),
  organizer: z.string().trim().min(2, "Bitte den Veranstalter angeben.").max(120),
  category: z.enum(["Freizeit", "Berufsorientierung", "Hobbies"]),
  sourceUrl: z.string().trim().url("Bitte eine gültige offizielle Internetadresse eingeben.").max(500).refine(
    (value) => /^https?:\/\//i.test(value),
    "Bitte eine Internetadresse mit http:// oder https:// eingeben.",
  ),
  flyerUrl: z.union([
    z.literal(""),
    z.string().trim().url("Bitte einen gültigen Link zum Flyer eingeben.").max(500).refine(
      (value) => /^https?:\/\//i.test(value),
      "Bitte einen Flyer-Link mit http:// oder https:// eingeben.",
    ),
  ]).optional().default(""),
  date: calendarDate,
  location: z.string().trim().min(2, "Bitte einen Ort angeben.").max(160),
  ageRange: z.string().trim().min(2, "Bitte die Altersspanne angeben oder auf den Veranstalter verweisen.").max(100),
  contactName: z.string().trim().max(100).optional().default(""),
  contactEmail: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben.").max(200),
  description: z.string().trim().min(20, "Bitte die Veranstaltung kurz beschreiben.").max(1500),
  consent: z.literal(true, { error: "Bitte die Angaben und Kontaktaufnahme bestätigen." }),
});

export type EventSubmission = z.infer<typeof submissionSchema>;

export function validateSubmission(input: unknown) {
  return submissionSchema.safeParse(input);
}
