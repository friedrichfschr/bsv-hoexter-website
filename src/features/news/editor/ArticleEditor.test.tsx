import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ArticleEditor } from "@/features/news/editor/ArticleEditor";
import type { Article } from "@/features/news/domain/article";

const article: Article = {
  id: "article-existing",
  slug: "bestehender-artikel",
  title: "Bestehender Artikel",
  summary: "Eine ausreichend lange Zusammenfassung.",
  body: "Ein ausreichend langer Artikeltext für den Test.",
  publishedAt: "2026-08-16",
  status: "draft",
  imageId: "",
  imageAlt: "",
};

function json(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }));
}

describe("ArticleEditor", () => {
  afterEach(() => vi.restoreAllMocks());

  it("updates a selected article through the PUT endpoint", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") return json({ article: { ...article, title: "Aktualisierter Artikel" } });
      return json({ articles: [{ ...article, title: init?.method ? "Aktualisierter Artikel" : article.title }] });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ArticleEditor />);

    fireEvent.click(await screen.findByRole("button", { name: /Bestehender Artikel/ }));
    fireEvent.change(screen.getByLabelText("Titel"), { target: { value: "Aktualisierter Artikel" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/redaktion/articles/article-existing",
      expect.objectContaining({ method: "PUT" }),
    ));
  });
});
