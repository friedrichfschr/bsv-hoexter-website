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

    fireEvent.click(screen.getByRole("tab", { name: "Über uns" }));
    expect(screen.getByRole("heading", { name: "Über uns verwalten" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Artikel anlegen" })).not.toBeInTheDocument();
  });
});
