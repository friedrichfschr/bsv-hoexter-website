import { randomUUID } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import {
  mutateEditorialContent,
  readEditorialContent,
  resolveEditorialDirectory,
} from "@/features/editorial/server/content-store";
import { articleSchema, type Article } from "@/features/news/domain/article";
import { readStoredUpload } from "@/shared/server/uploads";

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

function assertUniqueSlugs(articles: Article[]) {
  const slugs = new Set<string>();
  for (const article of articles) {
    if (slugs.has(article.slug)) throw new Error("Slug bereits vergeben.");
    slugs.add(article.slug);
  }
}

export async function validateArticles(directory: string, articles: Article[]) {
  assertUniqueSlugs(articles);
  for (const article of articles) await validateImage(directory, article);
}

export function selectPublishedArticles(content: { articles: Article[] }) {
  return content.articles.filter((article) => article.status === "published").sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function listPublishedArticles(directory = resolveEditorialDirectory()) {
  return selectPublishedArticles(await readEditorialContent(directory));
}

export async function findPublishedArticleBySlug(slug: string, directory = resolveEditorialDirectory()) {
  return (await listPublishedArticles(directory)).find((article) => article.slug === slug);
}

export async function createArticle(directory = resolveEditorialDirectory(), input: unknown) {
  return mutateEditorialContent(directory, async (content) => {
    const article = normalizeArticle(input, `article-${randomUUID()}`);
    assertUniqueSlug(content.articles, article);
    await validateImage(directory, article);
    return { content: { ...content, articles: [...content.articles, article] }, result: article };
  });
}

export async function updateArticle(directory = resolveEditorialDirectory(), id: string, input: unknown) {
  return mutateEditorialContent(directory, async (content) => {
    const existing = content.articles.find((article) => article.id === id);
    if (!existing) throw new Error("Artikel nicht gefunden.");
    const article = normalizeArticle(input, id);
    assertUniqueSlug(content.articles, article);
    await validateImage(directory, article);
    return { content: { ...content, articles: content.articles.map((item) => item.id === id ? article : item) }, result: article };
  });
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
