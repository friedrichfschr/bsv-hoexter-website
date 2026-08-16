import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AboutIntroductionEditor } from "@/features/about/AboutIntroductionEditor";
import { BdkArchiveEditor } from "@/features/about/BdkArchiveEditor";
import { BoardEditor } from "@/features/about/BoardEditor";
import { StatuteEditor } from "@/features/about/StatuteEditor";
import { defaultAboutContent } from "@/features/about/domain/content-schema";

describe("about editor component boundaries", () => {
  it("updates the introduction through its boundary", () => {
    const onChange = vi.fn();
    render(<AboutIntroductionEditor about={defaultAboutContent} onChange={onChange} />);

    fireEvent.change(screen.getByRole("textbox", { name: /Was wir sind/ }), { target: { value: "Neue Einleitung" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ intro: "Neue Einleitung" }));
  });

  it("adds records through the extracted collection editors", () => {
    const boardChange = vi.fn();
    const statuteChange = vi.fn();
    const bdkChange = vi.fn();
    const noop = vi.fn();

    const { rerender } = render(<BoardEditor about={defaultAboutContent} onChange={boardChange} onRemove={noop} onAddPhotos={async () => undefined} onReplacePhoto={async () => undefined} onRemovePhoto={noop} onError={noop} />);
    fireEvent.click(screen.getByRole("button", { name: "Vorstand hinzufügen" }));
    expect(boardChange).toHaveBeenCalledWith(expect.objectContaining({ boards: expect.arrayContaining([expect.objectContaining({ id: "" })]) }));

    rerender(<StatuteEditor about={defaultAboutContent} onChange={statuteChange} onRemove={noop} onUpload={async () => ""} onError={noop} />);
    fireEvent.click(screen.getByRole("button", { name: "Satzung hinzufügen" }));
    expect(statuteChange).toHaveBeenCalled();

    rerender(<BdkArchiveEditor about={defaultAboutContent} onChange={bdkChange} onRemove={noop} onUpload={async () => ""} onAddDocument={async () => undefined} onDetachDocument={noop} onError={noop} />);
    fireEvent.click(screen.getByRole("button", { name: "BDK hinzufügen" }));
    expect(bdkChange).toHaveBeenCalledWith(expect.objectContaining({ bdks: expect.arrayContaining([expect.objectContaining({ id: "" })]) }));
  });
});
