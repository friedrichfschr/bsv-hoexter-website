// @vitest-environment node
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createArticle, updateArticle } from "@/lib/articles";
import { emptyEditorialContent, publishedArticleBySlug, publishedArticles } from "@/lib/editorial";
import { readEditorialContent, writeEditorialContent } from "@/lib/editorial";

const draftInput = {
  slug: "erste-meldung",
  title: "Erste Meldung",
  summary: "Eine kurze Zusammenfassung für den Testartikel.",
  body: "Dies ist ein ausreichend langer Testtext für den Artikelinhalt.",
  publishedAt: "2099-01-01",
  status: "draft" as const,
  imageId: "",
  imageAlt: "",
};

const publishedInput = {
  ...draftInput,
  slug: "zweite-meldung",
  title: "Zweite Meldung",
  publishedAt: "2099-02-01",
  status: "published" as const,
};

describe("article service", () => {
  it("creates an article without replacing documents", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-articles-create-"));
    await writeEditorialContent(directory, {
      ...emptyEditorialContent,
      documents: [{
        id: "test-document",
        title: "Test document",
        kind: "satzung",
        date: "2099-01-01",
        status: "draft",
        mediaId: "test-media",
        fileName: "test.pdf",
      }],
    });

    const article = await createArticle(directory, draftInput);
    const stored = await readEditorialContent(directory);

    expect(article.slug).toBe("erste-meldung");
    expect(article.id).toMatch(/^article-/);
    expect(stored.articles).toEqual([article]);
    expect(stored.documents).toHaveLength(1);
  });

  it("rejects duplicate slugs", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-articles-duplicate-"));
    await writeEditorialContent(directory, { articles: [{ id: "existing", ...draftInput }], documents: [] });

    await expect(createArticle(directory, draftInput)).rejects.toThrow("Slug bereits vergeben");
  });

  it("updates an article and can publish it explicitly", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-articles-update-"));
    await writeEditorialContent(directory, { articles: [{ id: "existing", ...draftInput }], documents: [] });

    const article = await updateArticle(directory, "existing", { ...draftInput, status: "published" });

    expect(article.status).toBe("published");
    await expect(readEditorialContent(directory)).resolves.toMatchObject({ articles: [article] });
  });

  it("publishes only published articles through shared selectors", () => {
    const content = { articles: [
      { id: "draft", ...draftInput },
      { id: "published", ...publishedInput },
    ], documents: [] };

    expect(publishedArticles(content).map((article) => article.slug)).toEqual(["zweite-meldung"]);
    expect(publishedArticleBySlug(content, "erste-meldung")).toBeUndefined();
    expect(publishedArticleBySlug(content, "zweite-meldung")?.status).toBe("published");
  });
});
