// @vitest-environment node
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { editorialContentSchema, readEditorialContent, writeEditorialContent } from "@/lib/editorial";

const content = {
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
    await expect(readEditorialContent(directory)).resolves.toEqual({ articles: [], documents: [] });
  });
});
