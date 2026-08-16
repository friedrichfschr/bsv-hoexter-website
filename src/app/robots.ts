import type { MetadataRoute } from "next";
import { siteUrl } from "@/shared/config/site";

export default function robots(): MetadataRoute.Robots {
  const isLocalPreview = siteUrl.includes("localhost") || siteUrl.includes("127.0.0.1");
  return {
    rules: isLocalPreview
      ? { userAgent: "*", disallow: "/" }
      : { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
