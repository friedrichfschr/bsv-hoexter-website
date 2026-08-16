import type { MetadataRoute } from "next";
import { listPublishedArticles } from "@/features/news/server/article-service";
import { siteUrl } from "@/shared/config/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = ["", "/schwarzes-brett", "/aktuelles", "/mitmachen", "/mitmachen/anmelden", "/ueber-uns"];
  const staticEntries = routes.map((route) => ({
    url: `${siteUrl}${route}`,
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.5,
  }));
  const articleEntries = (await listPublishedArticles()).map((article) => ({
    url: `${siteUrl}/aktuelles/${article.slug}`,
    lastModified: article.publishedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  return [...staticEntries, ...articleEntries];
}
