import type { Article } from "@/features/editorial/server/content-store";
import { ArticleLead } from "@/features/news/ArticleLead";
import { ArticleList } from "@/features/news/ArticleList";
import { NewsEmptyState } from "@/features/news/NewsEmptyState";

export function ArticleIndex({ articles }: { articles: Article[] }) {
  return (
    <section className="news-page shell" aria-labelledby="news-heading">
      <header className="news-header">
        <p className="news-eyebrow">Neuigkeiten</p>
        <h1 id="news-heading">Aktuelles der BSV</h1>
      </header>
      {articles.length === 0 ? <NewsEmptyState /> : (
        <>
          <ArticleLead article={articles[0]} />
          {articles.length > 1 ? <ArticleList articles={articles.slice(1)} /> : null}
        </>
      )}
    </section>
  );
}
