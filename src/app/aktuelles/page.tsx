import { ArticleIndex } from "@/features/news/ArticleIndex";
import { readEditorialContent, publishedArticles } from "@/features/editorial/server/content-store";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const content = await readEditorialContent();
  return <ArticleIndex articles={publishedArticles(content)} />;
}
