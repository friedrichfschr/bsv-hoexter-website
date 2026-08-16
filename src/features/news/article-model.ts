import type { Article } from "@/features/editorial/server/content-store";

export function formatArticleDate(date: string) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(new Date(`${date}T12:00:00Z`));
}

export function articleParagraphs(article: Article) {
  return article.body.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

export function articleImageUrl(article: Article) {
  return article.imageId ? `/api/medien/${article.imageId}` : undefined;
}
