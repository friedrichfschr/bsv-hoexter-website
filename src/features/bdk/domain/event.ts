import { z } from "zod";
import { calendarDateSchema } from "@/shared/domain/calendar-date";

const optionalDate = z.union([z.literal(""), calendarDateSchema]);
const optionalTime = z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]);
const optionalUploadId = z.union([z.literal(""), z.uuid()]);

export const bdkEventSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(3).max(180),
  subtitle: z.string().trim().max(300).default(""),
  date: optionalDate,
  time: optionalTime,
  location: z.string().trim().max(180).default(""),
  invitationId: optionalUploadId.default(""),
  delegateKeyId: optionalUploadId.default(""),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const bdkEventMutationSchema = bdkEventSchema.pick({
  title: true,
  subtitle: true,
  date: true,
  time: true,
  location: true,
});

export type BdkEvent = z.infer<typeof bdkEventSchema>;
export type BdkEventMutation = z.infer<typeof bdkEventMutationSchema>;

export function createPreparedBdkEvent(now = new Date(), id = globalThis.crypto.randomUUID()): BdkEvent {
  const timestamp = now.toISOString();
  return {
    id,
    title: "Nächste Bezirksdelegiertenkonferenz",
    subtitle: "",
    date: "",
    time: "",
    location: "",
    invitationId: "",
    delegateKeyId: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function selectPublicBdkEvent(event: BdkEvent, today: string) {
  return !event.date || event.date >= today ? event : undefined;
}

export function hasBdkEventPassed(event: BdkEvent, today: string) {
  return Boolean(event.date && event.date < today);
}
