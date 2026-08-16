import { z } from "zod";
import { calendarDateSchema } from "@/shared/domain/calendar-date";

const identifier = z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/);

export const articleSchema = z.object({
  id: identifier,
  slug: identifier,
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().min(10).max(320),
  body: z.string().trim().min(20).max(30_000),
  publishedAt: calendarDateSchema,
  status: z.enum(["draft", "published"]),
  imageId: z.string().trim().max(100).default(""),
  imageAlt: z.string().trim().max(240).optional(),
});

export type Article = z.infer<typeof articleSchema>;
