// @vitest-environment node
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { editorialContentSchema, readEditorialContent, writeEditorialContent } from "@/lib/editorial";

const content = {
  articles: [{
    id: "article-1",
    slug: "erste-nachricht",
    title: "Erste Nachricht",
    summary: "Eine kurze und verständliche Zusammenfassung.",
    body: "Der vollständige Nachrichtentext für die öffentliche Seite.",
    publishedAt: "2026-08-11",
    status: "published" as const,
    imageId: "",
  }],
  documents: [{
    id: "document-1",
    title: "Satzung",
    kind: "satzung" as const,
    date: "2026-08-11",
    status: "draft" as const,
    mediaId: "media-1",
    fileName: "satzung.pdf",
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
