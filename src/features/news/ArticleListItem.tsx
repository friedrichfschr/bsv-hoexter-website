import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/features/news/domain/article";
import { articleImageUrl, formatArticleDate } from "@/features/news/article-model";

export function ArticleListItem({ article }: { article: Article }) {
  const imageUrl = articleImageUrl(article);
  return (
    <article className="news-list-item">
      {imageUrl ? <Image className="news-list-image" src={imageUrl} width={180} height={120} alt={article.imageAlt || ""} /> : null}
      <div className="news-list-copy">
        <p className="news-meta"><time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time></p>
        <h3><Link href={`/aktuelles/${article.slug}`}>{article.title}</Link></h3>
        <p>{article.summary}</p>
      </div>
    </article>
  );
}
