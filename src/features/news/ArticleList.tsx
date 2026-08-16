import type { Article } from "@/features/news/domain/article";
import { ArticleListItem } from "@/features/news/ArticleListItem";

export function ArticleList({ articles }: { articles: Article[] }) {
  return (
    <section className="news-list" aria-labelledby="news-list-heading">
      <h2 id="news-list-heading">ältere Meldungen</h2>
      <div className="news-list-items">
        {articles.map((article) => <ArticleListItem article={article} key={article.id} />)}
      </div>
    </section>
  );
}
