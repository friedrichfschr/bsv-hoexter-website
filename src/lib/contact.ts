import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().max(100).optional().default(""),
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben.").max(200),
  school: z.string().trim().max(150).optional().default(""),
  message: z.string().trim().min(20, "Bitte beschreibe dein Anliegen etwas genauer.").max(3000),
  privacy: z.literal(true, { error: "Bitte den Datenschutzhinweis bestätigen." }),
});

export type ContactMessage = z.infer<typeof contactSchema>;

export function validateContact(input: unknown) {
  return contactSchema.safeParse(input);
}
