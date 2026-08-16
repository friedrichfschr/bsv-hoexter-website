import { z } from "zod";
import { bdkEventSchema } from "@/features/bdk/domain/event";
import { bdkSignupSchema } from "@/features/bdk/domain/signup";

export const bdkSignupStatusSchema = z.enum(["active", "cancelled"]);

export const bdkSignupRecordSchema = bdkSignupSchema.extend({
  id: z.uuid(),
  eventId: z.uuid(),
  eventTitle: z.string().trim().min(3).max(180),
  eventDate: z.string(),
  status: bdkSignupStatusSchema,
  registeredAt: z.iso.datetime(),
  cancelledAt: z.union([z.literal(""), z.iso.datetime()]).default(""),
  confirmationSentAt: z.union([z.literal(""), z.iso.datetime()]).default(""),
  cancellationTokenHash: z.string().max(200).default(""),
});

export const bdkStateSchema = z.object({
  event: bdkEventSchema,
  signups: z.array(bdkSignupRecordSchema).max(5000),
});

export type BdkSignupStatus = z.infer<typeof bdkSignupStatusSchema>;
export type BdkSignupRecord = z.infer<typeof bdkSignupRecordSchema>;
export type BdkState = z.infer<typeof bdkStateSchema>;
