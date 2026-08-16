import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/features/editorial/server/content-store";
import { articleImageUrl, formatArticleDate } from "@/features/news/article-model";

export function ArticleLead({ article }: { article: Article }) {
  const imageUrl = articleImageUrl(article);
  return (
    <article className={imageUrl ? "news-lead" : "news-lead news-lead-no-image"}>
      {imageUrl ? (
        <div className="news-lead-image">
          <Image src={imageUrl} alt={article.imageAlt || ""} fill sizes="(max-width: 780px) 100vw, 52vw" />
        </div>
      ) : null}
      <div className="news-lead-copy">
        <p className="news-meta"><time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time></p>
        <h2>{article.title}</h2>
        <p className="news-summary">{article.summary}</p>
        <Link className="news-read-link" href={`/aktuelles/${article.slug}`}>Artikel lesen <span aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
}
