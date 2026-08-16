import { z } from "zod";
import { bdkEventSchema } from "@/features/bdk/domain/event";
import { bdkSignupSchema } from "@/features/bdk/domain/signup";
import { calendarDateSchema } from "@/shared/domain/calendar-date";

export const bdkSignupStatusSchema = z.enum(["active", "cancelled"]);

export const bdkSignupRecordSchema = bdkSignupSchema.extend({
  id: z.uuid(),
  eventId: z.uuid(),
  eventTitle: z.string().trim().min(3).max(180),
  eventDate: z.union([z.literal(""), calendarDateSchema]),
  status: bdkSignupStatusSchema,
  registeredAt: z.iso.datetime(),
  cancelledAt: z.union([z.literal(""), z.iso.datetime()]).default(""),
  confirmationSentAt: z.union([z.literal(""), z.iso.datetime()]).default(""),
  cancellationTokenHash: z.string().max(200).default(""),
});

export const bdkStateSchema = z.object({
  event: bdkEventSchema,
  signups: z.array(bdkSignupRecordSchema).max(200),
}).superRefine((state, context) => {
  const ids = new Set<string>();
  const activeEmails = new Set<string>();
  state.signups.forEach((signup, index) => {
    if (ids.has(signup.id)) {
      context.addIssue({ code: "custom", message: "Doppelte Anmeldungs-ID.", path: ["signups", index, "id"] });
    }
    ids.add(signup.id);
    if (signup.status !== "active") return;
    const key = `${signup.eventId}:${signup.email}`;
    if (activeEmails.has(key)) {
      context.addIssue({ code: "custom", message: "Doppelte aktive Anmeldung.", path: ["signups", index, "email"] });
    }
    activeEmails.add(key);
  });
});

export type BdkSignupStatus = z.infer<typeof bdkSignupStatusSchema>;
export type BdkSignupRecord = z.infer<typeof bdkSignupRecordSchema>;
export type BdkState = z.infer<typeof bdkStateSchema>;
