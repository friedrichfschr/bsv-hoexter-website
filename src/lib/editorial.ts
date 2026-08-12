import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { aboutContentSchema, defaultAboutContent } from "@/lib/about-schema";

const status = z.enum(["draft", "published"]);
const identifier = z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/);

function isValidIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

const isoDate = z.string().refine(isValidIsoDate, "Bitte ein gültiges Datum angeben.");

export const articleSchema = z.object({
  id: identifier,
  slug: identifier,
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().min(10).max(320),
  body: z.string().trim().min(20).max(30_000),
  publishedAt: isoDate,
  status,
  imageId: z.string().trim().max(100).default(""),
  imageAlt: z.string().trim().max(240).optional(),
});

export const documentSchema = z.object({
  id: identifier,
  title: z.string().trim().min(3).max(180),
  kind: z.enum(["satzung", "bdk-protokoll", "geschaeftsordnung", "sonstiges"]),
  date: isoDate,
  status,
  mediaId: identifier,
  fileName: z.string().trim().min(1).max(180),
});

export const editorialContentSchema = z.object({
  articles: z.array(articleSchema).max(500),
  documents: z.array(documentSchema).max(500),
  about: aboutContentSchema.default(defaultAboutContent),
});

export type Article = z.infer<typeof articleSchema>;
export type EditorialContent = z.infer<typeof editorialContentSchema>;
export const emptyEditorialContent: EditorialContent = { articles: [], documents: [], about: defaultAboutContent };
const writeQueues = new Map<string, Promise<void>>();

async function enqueueEditorialWrite<T>(directory: string, operation: () => Promise<T>) {
  const previous = writeQueues.get(directory) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  writeQueues.set(directory, current);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (writeQueues.get(directory) === current) writeQueues.delete(directory);
  }
}

async function writeEditorialFile(directory: string, content: EditorialContent) {
  await mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `content.${process.pid}.${randomUUID()}.tmp`);
  await writeFile(temporary, `${JSON.stringify(content, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path.join(directory, "content.json"));
}

export function resolveEditorialDirectory(environment: NodeJS.ProcessEnv = process.env) {
  return path.resolve(/* turbopackIgnore: true */ environment.EDITORIAL_CONTENT_DIRECTORY || ".editorial-content");
}

export async function readEditorialContent(directory = resolveEditorialDirectory()): Promise<EditorialContent> {
  try {
    const raw = await readFile(path.join(directory, "content.json"), "utf8");
    return editorialContentSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(emptyEditorialContent);
    throw error;
  }
}

export async function writeEditorialContent(directory: string, input: unknown): Promise<EditorialContent> {
  const content = editorialContentSchema.parse(input);
  return enqueueEditorialWrite(directory, async () => {
    await writeEditorialFile(directory, content);
    return content;
  });
}

export async function mutateEditorialContent<T>(
  directory: string,
  mutation: (content: EditorialContent) => Promise<{ content: unknown; result: T; afterWrite?: () => Promise<void> }> | { content: unknown; result: T; afterWrite?: () => Promise<void> },
) {
  return enqueueEditorialWrite(directory, async () => {
    const current = await readEditorialContent(directory);
    const changed = await mutation(current);
    const content = editorialContentSchema.parse(changed.content);
    await writeEditorialFile(directory, content);
    await changed.afterWrite?.();
    return changed.result;
  });
}

export function publishedArticles(content: Pick<EditorialContent, "articles">) {
  return content.articles.filter((article) => article.status === "published").sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function publishedArticleBySlug(content: Pick<EditorialContent, "articles">, slug: string) {
  return publishedArticles(content).find((article) => article.slug === slug);
}

export function publishedDocuments(content: EditorialContent, kind?: EditorialContent["documents"][number]["kind"]) {
  return content.documents.filter((document) => document.status === "published" && (!kind || document.kind === kind)).sort((a, b) => b.date.localeCompare(a.date));
}
