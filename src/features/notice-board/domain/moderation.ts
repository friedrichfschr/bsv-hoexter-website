import { z } from "zod";
import { eventSubmissionCategories } from "@/features/notice-board/domain/events";
import { calendarDateSchema } from "@/shared/domain/calendar-date";

const identifierSchema = z.string().uuid();
const statusSchema = z.enum(["pending", "approved", "rejected"]);
const optionalIdentifierSchema = z.union([z.literal(""), identifierSchema]).default("");
const optionalDateSchema = z.union([z.literal(""), calendarDateSchema]).default("");
const websiteSchema = z.string().trim().url().max(500).refine((value) => /^https?:\/\//i.test(value));

export const posterPlacementSchema = z.object({
  boardId: z.enum(["left", "right"]),
  left: z.number().min(0).max(92),
  top: z.number().min(0).max(92),
  width: z.number().min(8).max(60),
  height: z.number().min(8).max(80),
  rotation: z.number().min(-15).max(15),
}).refine((placement) => placement.left + placement.width <= 100, {
  message: "Das Poster ragt rechts über das Brett hinaus.",
  path: ["left"],
}).refine((placement) => placement.top + placement.height <= 100, {
  message: "Das Poster ragt unten über das Brett hinaus.",
  path: ["top"],
});

export const moderatedEventSchema = z.object({
  id: identifierSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  rejectedAt: z.string().datetime().optional(),
  status: statusSchema,
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(20).max(1500),
  date: calendarDateSchema,
  location: z.string().trim().min(1).max(160),
  ageRange: z.string().trim().min(1).max(100),
  website: websiteSchema,
  organizer: z.string().trim().min(1).max(120),
  category: z.enum(eventSubmissionCategories),
  contactName: z.string().trim().max(100).default(""),
  contactEmail: z.string().trim().email().max(200),
});

export const moderatedPosterSchema = z.object({
  id: identifierSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  rejectedAt: z.string().datetime().optional(),
  status: statusSchema,
  title: z.string().trim().min(4).max(120),
  contactName: z.string().trim().max(100).default(""),
  contactEmail: z.string().trim().email().max(200),
  mediaId: identifierSchema,
  eventId: optionalIdentifierSchema,
  expiresAt: optionalDateSchema,
  placement: posterPlacementSchema.optional(),
  layer: z.number().int().nonnegative().default(0),
});

export const noticeBoardContentSchema = z.object({
  events: z.array(moderatedEventSchema).max(1000),
  posters: z.array(moderatedPosterSchema).max(1000),
});

export const eventModerationMutationSchema = moderatedEventSchema.pick({
  title: true,
  description: true,
  date: true,
  location: true,
  ageRange: true,
  website: true,
  organizer: true,
  category: true,
  status: true,
});

export const posterModerationMutationSchema = z.object({
  status: statusSchema,
  expiresAt: optionalDateSchema,
  placement: posterPlacementSchema.optional(),
  bringToFront: z.boolean().optional().default(false),
}).superRefine((value, context) => {
  if (value.status !== "approved") return;
  if (!value.expiresAt) context.addIssue({ code: "custom", path: ["expiresAt"], message: "Bitte ein Ablaufdatum festlegen." });
  if (!value.placement) context.addIssue({ code: "custom", path: ["placement"], message: "Bitte das Poster auf einem Brett platzieren." });
});

export type NoticeBoardContent = z.infer<typeof noticeBoardContentSchema>;
export type ModeratedEvent = z.infer<typeof moderatedEventSchema>;
export type ModeratedPoster = z.infer<typeof moderatedPosterSchema>;
export type PosterPlacement = z.infer<typeof posterPlacementSchema>;
