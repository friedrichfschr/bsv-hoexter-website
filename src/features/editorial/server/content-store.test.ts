// @vitest-environment node
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { editorialContentSchema, readEditorialContent, writeEditorialContent } from "@/features/editorial/server/content-store";
import { defaultAboutContent } from "@/features/about/domain/content-schema";

const content = {
  about: defaultAboutContent,
  articles: [{
    id: "test-article",
    slug: "test-article",
    title: "Test article",
    summary: "A test-only article summary.",
    body: "A test-only body with enough content for schema validation.",
    publishedAt: "2099-01-01",
    status: "published" as const,
    imageId: "",
  }],
  documents: [{
    id: "test-document",
    title: "Test document",
    kind: "satzung" as const,
    date: "2099-01-01",
    status: "draft" as const,
    mediaId: "test-media",
    fileName: "test-document.pdf",
  }],
};

describe("editorial content", () => {
  it("validates editable news and document records", () => {
    expect(editorialContentSchema.safeParse(content).success).toBe(true);
    expect(editorialContentSchema.safeParse({ ...content, articles: [{ ...content.articles[0], slug: "Nicht gültig" }] }).success).toBe(false);
  });

  it("writes and reads the complete editorial workspace atomically", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-editorial-"));
    await writeEditorialContent(directory, content);
    await expect(readEditorialContent(directory)).resolves.toEqual(content);
  });

  it("returns an empty scaffold when no workspace exists yet", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-editorial-empty-"));
    await expect(readEditorialContent(directory)).resolves.toEqual({ articles: [], documents: [], about: defaultAboutContent });
  });

  it("keeps concurrent writes isolated from each other's temporary files", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-editorial-concurrent-"));
    const versions = Array.from({ length: 8 }, (_, index) => ({
      ...content,
      articles: [{ ...content.articles[0], title: `Test article ${index}` }],
    }));

    await expect(Promise.all(versions.map((version) => writeEditorialContent(directory, version)))).resolves.toHaveLength(8);
    await expect(readEditorialContent(directory)).resolves.toEqual(versions.at(-1));
  });
});
