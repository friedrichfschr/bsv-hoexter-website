import { ArticleIndex } from "@/features/news/ArticleIndex";
import { listPublishedArticles } from "@/features/news/server/article-service";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  return <ArticleIndex articles={await listPublishedArticles()} />;
}
