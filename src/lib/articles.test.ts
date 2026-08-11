// @vitest-environment node
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createArticle, replaceEditorialContent, updateArticle } from "@/lib/articles";
import { emptyEditorialContent, publishedArticleBySlug, publishedArticles, articleSchema } from "@/lib/editorial";
import { readEditorialContent, writeEditorialContent } from "@/lib/editorial";
import { storeUpload } from "@/lib/uploads";

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

  it("rejects impossible calendar dates", () => {
    const article = { id: "date-test", ...draftInput };
    expect(() => articleSchema.parse({ ...article, publishedAt: "2099-02-29" })).toThrow();
    expect(() => articleSchema.parse({ ...article, publishedAt: "2099-02-30" })).toThrow();
    expect(() => articleSchema.parse({ ...article, publishedAt: "2099-13-01" })).toThrow();
  });

  it("keeps concurrent article creates and rejects invalid whole-content replacements", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-articles-concurrent-"));
    const first = { ...draftInput, slug: "parallel-eins", title: "Parallel eins" };
    const second = { ...draftInput, slug: "parallel-zwei", title: "Parallel zwei" };

    await Promise.all([createArticle(directory, first), createArticle(directory, second)]);
    await expect(readEditorialContent(directory)).resolves.toMatchObject({
      articles: expect.arrayContaining([
        expect.objectContaining({ slug: "parallel-eins" }),
        expect.objectContaining({ slug: "parallel-zwei" }),
      ]),
    });

    await expect(replaceEditorialContent(directory, {
      articles: [
        { ...publishedInput, id: "first", slug: "duplicate" },
        { ...publishedInput, id: "second", slug: "duplicate" },
      ],
      documents: [],
    })).rejects.toThrow("Slug bereits vergeben");

    const upload = await storeUpload(path.join(directory, "media"), new File([
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ], "test.png", { type: "image/png" }));
    await expect(replaceEditorialContent(directory, {
      articles: [{ ...publishedInput, id: "with-image", imageId: upload.id, imageAlt: "" }],
      documents: [],
    })).rejects.toThrow("Alternativtext");
  });
});
