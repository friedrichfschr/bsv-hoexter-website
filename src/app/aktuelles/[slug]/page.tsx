import { notFound } from "next/navigation";
import { ArticleDetail } from "@/features/news/ArticleDetail";
import { findPublishedArticleBySlug } from "@/features/news/server/article-service";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

export default async function NewsArticlePage({ params }: Context) {
  const { slug } = await params;
  const article = await findPublishedArticleBySlug(slug);
  if (!article) notFound();
  return <ArticleDetail article={article} />;
}
