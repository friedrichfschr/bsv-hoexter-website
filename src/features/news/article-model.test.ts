import { describe, expect, it } from "vitest";
import { articleImageUrl, articleParagraphs, formatArticleDate } from "@/features/news/article-model";
import type { Article } from "@/features/news/domain/article";

const article: Article = {
  id: "test-article",
  slug: "test-article",
  title: "Test article",
  summary: "A test-only article summary.",
  body: "First paragraph.\n\nSecond paragraph.",
  publishedAt: "2099-01-02",
  status: "published",
  imageId: "",
};

describe("news article view helpers", () => {
  it("formats dates deterministically for the German public page", () => {
    expect(formatArticleDate("2099-01-02")).toBe("2. Januar 2099");
  });

  it("splits plain text bodies into safe paragraphs", () => {
    expect(articleParagraphs(article)).toEqual(["First paragraph.", "Second paragraph."]);
  });

  it("only creates an image URL when an article references media", () => {
    expect(articleImageUrl(article)).toBeUndefined();
    expect(articleImageUrl({ ...article, imageId: "media-id" })).toBe("/api/medien/media-id");
  });
});
