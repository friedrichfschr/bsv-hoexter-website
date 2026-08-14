// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import Image from "next/image";
import { beforeAll, describe, expect, it } from "vitest";
import { EntryPreview } from "@/features/about/EntryPreview";

describe("EntryPreview", () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
  });

  it("shows a short entry directly", () => {
    render(<EntryPreview title="BDK 2026" content="Kurzer Rückblick auf die Konferenz." />);
    expect(screen.getByText("Kurzer Rückblick auf die Konferenz.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Mehr lesen/ })).toBeNull();
  });

  it("opens the complete long entry in a modal", () => {
    const content = "Ein ausführlicher Rückblick auf die Bezirksdelegiertenkonferenz. ".repeat(8);
    render(<EntryPreview title="BDK 2026" content={content} />);

    fireEvent.click(screen.getByRole("button", { name: "Mehr lesen: BDK 2026" }));
    const dialog = screen.getByRole("dialog", { name: "BDK 2026" });
    expect(dialog).toHaveTextContent(content.trim());

    fireEvent.click(within(dialog).getByRole("button", { name: "Schließen" }));
    expect(screen.queryByRole("dialog", { name: "BDK 2026" })).toBeNull();
  });

  it("includes entry photos and actions in the modal", () => {
    const content = "Ein ausführlicher Bericht über die Arbeit des Bezirksvorstands. ".repeat(8);
    render(<EntryPreview
      title="Vorstand 2026/27"
      content={content}
      modalMedia={<Image src="/vorstand.jpg" alt="Vorstand und Landesdelegierte" width={320} height={180} />}
      modalActions={<a href="/protokoll.pdf">Protokoll herunterladen</a>}
    />);

    fireEvent.click(screen.getByRole("button", { name: "Mehr lesen: Vorstand 2026/27" }));
    const dialog = screen.getByRole("dialog", { name: "Vorstand 2026/27" });
    expect(within(dialog).getByRole("img", { name: "Vorstand und Landesdelegierte" })).toBeVisible();
    expect(within(dialog).getByRole("link", { name: "Protokoll herunterladen" })).toHaveAttribute("href", "/protokoll.pdf");
  });
});
