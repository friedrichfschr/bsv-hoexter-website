import { z } from "zod";
import { eventSubmissionCategories } from "@/domain/events";

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein gültiges Datum wählen.").refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}, "Bitte ein gültiges Datum wählen.");

export const submissionKinds = ["poster", "event", "both"] as const;
export type SubmissionKind = (typeof submissionKinds)[number];

const optionalWebsite = z.union([
  z.literal(""),
  z.string().trim().url("Bitte eine gültige offizielle Internetadresse eingeben.").max(500).refine(
    (value) => /^https?:\/\//i.test(value),
    "Bitte eine Internetadresse mit http:// oder https:// eingeben.",
  ),
]).optional().default("");

export const submissionSchema = z.object({
  submissionKind: z.enum(submissionKinds),
  title: z.string().trim().min(4, "Bitte einen aussagekräftigen Titel eingeben.").max(120),
  organizer: z.string().trim().max(120).optional().default(""),
  category: z.union([z.literal(""), z.enum(eventSubmissionCategories)]).optional().default(""),
  website: optionalWebsite,
  date: z.union([z.literal(""), calendarDate]).optional().default(""),
  location: z.string().trim().max(160).optional().default(""),
  ageRange: z.string().trim().max(100).optional().default(""),
  contactName: z.string().trim().max(100).optional().default(""),
  contactEmail: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben.").max(200),
  description: z.string().trim().max(1500).optional().default(""),
  consent: z.literal(true, { error: "Bitte die Angaben und Kontaktaufnahme bestätigen." }),
}).superRefine((submission, context) => {
  if (!submissionIncludesEvent(submission.submissionKind)) return;
  const required = [
    ["organizer", submission.organizer, "Bitte den Veranstalter angeben."],
    ["category", submission.category, "Bitte eine Kategorie auswählen."],
    ["website", submission.website, "Bitte die Website angeben."],
    ["date", submission.date, "Bitte ein Datum auswählen."],
    ["location", submission.location, "Bitte einen Ort angeben."],
    ["ageRange", submission.ageRange, "Bitte die Altersspanne angeben."],
    ["description", submission.description.length >= 20 ? submission.description : "", "Bitte die Veranstaltung kurz beschreiben."],
  ] as const;
  for (const [field, value, message] of required) {
    if (value) continue;
    context.addIssue({ code: "custom", path: [field], message });
  }
});

export type BoardSubmission = z.infer<typeof submissionSchema>;

export function submissionRequiresPoster(kind: SubmissionKind) {
  return kind === "poster" || kind === "both";
}

export function submissionIncludesEvent(kind: SubmissionKind) {
  return kind === "event" || kind === "both";
}

export function validateSubmission(input: unknown) {
  return submissionSchema.safeParse(input);
}
