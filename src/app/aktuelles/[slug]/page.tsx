import { notFound } from "next/navigation";
import { ArticleDetail } from "@/features/news/ArticleDetail";
import { publishedArticleBySlug, readEditorialContent } from "@/features/editorial/server/content-store";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

export default async function NewsArticlePage({ params }: Context) {
  const { slug } = await params;
  const article = publishedArticleBySlug(await readEditorialContent(), slug);
  if (!article) notFound();
  return <ArticleDetail article={article} />;
}
