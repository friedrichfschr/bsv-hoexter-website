import { randomUUID } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import {
  articleSchema,
  readEditorialContent,
  resolveEditorialDirectory,
  writeEditorialContent,
  type Article,
} from "@/lib/editorial";
import { readStoredUpload } from "@/lib/uploads";

const articleMutationSchema = articleSchema.omit({ id: true }).extend({ id: z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/).optional() });
export type ArticleMutation = z.input<typeof articleMutationSchema>;

function normalizeArticle(input: unknown, id: string): Article {
  const parsed = articleMutationSchema.parse(input);
  return articleSchema.parse({
    ...parsed,
    id,
    imageId: parsed.imageId || "",
    imageAlt: parsed.imageAlt || "",
  });
}

async function validateImage(directory: string, article: Article) {
  if (!article.imageId) return;
  const metadata = await readStoredUpload(path.join(directory, "media"), article.imageId);
  if (!metadata || !metadata.mediaType.startsWith("image/")) throw new Error("Das ausgewählte Bild wurde nicht gefunden.");
  if (article.status === "published" && !article.imageAlt) throw new Error("Bitte einen Alternativtext für das Bild angeben.");
}

function assertUniqueSlug(articles: Article[], article: Article) {
  if (articles.some((item) => item.slug === article.slug && item.id !== article.id)) throw new Error("Slug bereits vergeben.");
}

export async function createArticle(directory = resolveEditorialDirectory(), input: unknown) {
  const content = await readEditorialContent(directory);
  const article = normalizeArticle(input, `article-${randomUUID()}`);
  assertUniqueSlug(content.articles, article);
  await validateImage(directory, article);
  await writeEditorialContent(directory, { ...content, articles: [...content.articles, article] });
  return article;
}

export async function updateArticle(directory = resolveEditorialDirectory(), id: string, input: unknown) {
  const content = await readEditorialContent(directory);
  const existing = content.articles.find((article) => article.id === id);
  if (!existing) throw new Error("Artikel nicht gefunden.");
  const article = normalizeArticle(input, id);
  assertUniqueSlug(content.articles, article);
  await validateImage(directory, article);
  await writeEditorialContent(directory, { ...content, articles: content.articles.map((item) => item.id === id ? article : item) });
  return article;
}

export function articleMutationFromRecord(article: Article): ArticleMutation {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    body: article.body,
    publishedAt: article.publishedAt,
    status: article.status,
    imageId: article.imageId,
    imageAlt: article.imageAlt || "",
  };
}
