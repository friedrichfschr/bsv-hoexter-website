import { ArticleIndex } from "@/features/news/ArticleIndex";
import { readEditorialContent, publishedArticles } from "@/lib/editorial";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const content = await readEditorialContent();
  return <ArticleIndex articles={publishedArticles(content)} />;
}
