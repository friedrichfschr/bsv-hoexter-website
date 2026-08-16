import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorialDashboard } from "@/features/editorial/EditorialDashboard";

const response = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), {
  status: 200,
  headers: { "Content-Type": "application/json" },
}));

describe("EditorialDashboard", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps workspace navigation separate from the article editor", async () => {
    vi.stubGlobal("fetch", vi.fn(() => response({ articles: [] })));
    render(<EditorialDashboard />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Artikel verwalten" })).toBeInTheDocument());
    expect(screen.getByRole("tab", { name: "Aktuelles" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Artikel anlegen" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Titel"), { target: { value: "Ungespeicherter Entwurf" } });

    fireEvent.click(screen.getByRole("tab", { name: "Über uns" }));
    expect(screen.getByRole("heading", { name: "Über uns verwalten" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Artikel anlegen" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Aktuelles" }));
    expect(screen.getByLabelText("Titel")).toHaveValue("Ungespeicherter Entwurf");
  });

  it("resets a selected article when a new article is requested", async () => {
    vi.stubGlobal("fetch", vi.fn(() => response({ articles: [{
      id: "existing",
      slug: "existing",
      title: "Bestehender Artikel",
      summary: "Eine ausreichend lange Zusammenfassung.",
      body: "Ein ausreichend langer Artikeltext für den Test.",
      publishedAt: "2026-08-16",
      status: "draft",
      imageId: "",
      imageAlt: "",
    }] })));
    render(<EditorialDashboard />);

    fireEvent.click(await screen.findByRole("button", { name: /Bestehender Artikel/ }));
    expect(screen.getByLabelText("Titel")).toHaveValue("Bestehender Artikel");
    fireEvent.click(screen.getByRole("button", { name: "Neuer Artikel" }));

    await waitFor(() => expect(screen.getByLabelText("Titel")).toHaveValue(""));
  });
});
