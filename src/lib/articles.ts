import { randomUUID } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import {
  articleSchema,
  editorialContentSchema,
  mutateEditorialContent,
  resolveEditorialDirectory,
  type Article,
} from "@/lib/editorial";
import { readStoredUpload } from "@/lib/uploads";
import { cleanupRemovedAboutUploads, validateAboutContent } from "@/lib/about-content";

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

async function validateArticles(directory: string, articles: Article[]) {
  assertUniqueSlugs(articles);
  for (const article of articles) await validateImage(directory, article);
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

export async function replaceEditorialContent(directory = resolveEditorialDirectory(), input: unknown) {
  return mutateEditorialContent(directory, async (current) => {
    const object = z.object({
      articles: editorialContentSchema.shape.articles,
      documents: editorialContentSchema.shape.documents,
      about: z.unknown().optional(),
    }).parse(input);
    const content = editorialContentSchema.parse({ ...object, about: object.about === undefined ? current.about : object.about });
    await validateArticles(directory, content.articles);
    await validateAboutContent(directory, content.about);
    return {
      content,
      result: content,
      afterWrite: () => cleanupRemovedAboutUploads(directory, current.about, content.about, [
        ...content.articles.map((article) => article.imageId),
        ...content.documents.map((document) => document.mediaId),
      ]),
    };
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
