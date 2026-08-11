import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const status = z.enum(["draft", "published"]);
const identifier = z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

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
});

export type Article = z.infer<typeof articleSchema>;
export type EditorialContent = z.infer<typeof editorialContentSchema>;
export const emptyEditorialContent: EditorialContent = { articles: [], documents: [] };
const writeQueues = new Map<string, Promise<void>>();

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
  const previous = writeQueues.get(directory) ?? Promise.resolve();
  const operation = previous.catch(() => undefined).then(async () => {
    await mkdir(directory, { recursive: true });
    const temporary = path.join(directory, `content.${process.pid}.${randomUUID()}.tmp`);
    await writeFile(temporary, `${JSON.stringify(content, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, path.join(directory, "content.json"));
  });
  writeQueues.set(directory, operation);
  try {
    await operation;
    return content;
  } finally {
    if (writeQueues.get(directory) === operation) writeQueues.delete(directory);
  }
}

export function publishedArticles(content: EditorialContent) {
  return content.articles.filter((article) => article.status === "published").sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function publishedArticleBySlug(content: EditorialContent, slug: string) {
  return publishedArticles(content).find((article) => article.slug === slug);
}

export function publishedDocuments(content: EditorialContent, kind?: EditorialContent["documents"][number]["kind"]) {
  return content.documents.filter((document) => document.status === "published" && (!kind || document.kind === kind)).sort((a, b) => b.date.localeCompare(a.date));
}
