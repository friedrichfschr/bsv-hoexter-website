import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExpandableArchive } from "@/features/about/ExpandableArchive";

describe("ExpandableArchive", () => {
  it("limits long lists and expands them from the bottom", () => {
    render(<ExpandableArchive label="Vorstandsarchiv" initialCount={2}>{[
      <article key="1">Eintrag 1</article>,
      <article key="2">Eintrag 2</article>,
      <article key="3">Eintrag 3</article>,
    ]}</ExpandableArchive>);

    expect(screen.getByText("Eintrag 3")).not.toBeVisible();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Eintrag 3")).toBeVisible();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Eintrag 3")).not.toBeVisible();
  });
});
