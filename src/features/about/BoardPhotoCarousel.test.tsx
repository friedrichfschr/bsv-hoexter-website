// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BoardPhotoCarousel } from "@/features/about/BoardPhotoCarousel";

const photos = [
  { id: "vorstand", alt: "Der Bezirksvorstand" },
  { id: "landesdelegierte", alt: "Die Landesdelegierten" },
];

describe("BoardPhotoCarousel", () => {
  it("moves between photos without wrapping and exposes direct dots", () => {
    render(<BoardPhotoCarousel label="Bilder Vorstand 2026/27" photos={photos} />);
    const carousel = screen.getByRole("region", { name: "Bilder Vorstand 2026/27" });
    const previous = within(carousel).getByRole("button", { name: "Vorheriges Bild" });
    const next = within(carousel).getByRole("button", { name: "Nächstes Bild" });

    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();
    expect(within(carousel).getByRole("img", { name: "Der Bezirksvorstand" })).toBeVisible();

    fireEvent.click(next);
    expect(within(carousel).getByRole("img", { name: "Die Landesdelegierten" })).toBeVisible();
    expect(previous).toBeEnabled();
    expect(next).toBeDisabled();
    expect(within(carousel).getByRole("button", { name: "Bild 2 anzeigen" })).toHaveAttribute("aria-current", "true");

    fireEvent.click(within(carousel).getByRole("button", { name: "Bild 1 anzeigen" }));
    expect(within(carousel).getByRole("img", { name: "Der Bezirksvorstand" })).toBeVisible();
  });

  it("omits navigation for a single photo", () => {
    render(<BoardPhotoCarousel label="Ein Bild" photos={photos.slice(0, 1)} />);
    const carousel = screen.getByRole("region", { name: "Ein Bild" });
    expect(within(carousel).queryByRole("button")).toBeNull();
  });
});
