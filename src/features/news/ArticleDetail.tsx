import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/editorial";
import { articleImageUrl, articleParagraphs, formatArticleDate } from "@/features/news/article-model";

export function ArticleDetail({ article }: { article: Article }) {
  const imageUrl = articleImageUrl(article);
  return (
    <article className="news-detail shell">
      <Link className="news-back-link" href="/aktuelles">← Alle Meldungen</Link>
      <header className="news-detail-header">
        <p className="news-meta"><time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time></p>
        <h1>{article.title}</h1>
        <p className="news-detail-summary">{article.summary}</p>
      </header>
      {imageUrl ? (
        <figure className="news-detail-image">
          <Image src={imageUrl} alt={article.imageAlt || ""} fill sizes="(max-width: 780px) 100vw, 900px" />
        </figure>
      ) : null}
      <div className="news-body">
        {articleParagraphs(article).map((paragraph, index) => <p key={`${article.id}-paragraph-${index}`}>{paragraph}</p>)}
      </div>
    </article>
  );
}
