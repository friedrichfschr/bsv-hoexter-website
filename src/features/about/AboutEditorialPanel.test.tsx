// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AboutEditorialPanel } from "@/features/about/AboutEditorialPanel";
import { defaultAboutContent } from "@/features/about/domain/content-schema";

describe("AboutEditorialPanel", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps the founding BDK fixed and exposes only its attachments", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ about: defaultAboutContent }) }));
    render(<AboutEditorialPanel />);
    await screen.findByLabelText("Aktiver Bezirksvorstand");

    const foundingSummary = screen.getByText("Gründungs-BDK").closest("summary");
    expect(foundingSummary).not.toBeNull();
    fireEvent.click(foundingSummary!);
    const founding = screen.getByRole("group", { name: "BDK 1" });

    expect(within(founding).getByLabelText("Neuen Anhang BDK 1")).toBeVisible();
    expect(within(founding).queryByLabelText("Titel BDK 1", { exact: true })).toBeNull();
    expect(within(founding).queryByLabelText("Neues Foto BDK 1")).toBeNull();
    expect(within(founding).queryByLabelText("Status Anhang 1 BDK 1")).toBeNull();
    expect(within(founding).queryByLabelText("Art Anhang 1 BDK 1")).toBeNull();
    expect(within(founding).queryByLabelText("Datum Anhang 1 BDK 1")).toBeNull();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });

  it("removes derived chronology and visibility controls", async () => {
    const about = structuredClone(defaultAboutContent);
    about.bdks.push({ ...about.bdks[0], id: "bdk-2027", title: "BDK 2027", founding: false, documentIds: [], photoIds: [], links: [], status: "draft" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ about }) }));
    render(<AboutEditorialPanel />);
    await screen.findByLabelText("Aktiver Bezirksvorstand");

    expect(screen.queryByLabelText("Status Vorstand 1")).toBeNull();
    expect(screen.queryByLabelText("Ende Vorstand 1")).toBeNull();
    expect(screen.queryByLabelText("Status Dokument 1")).toBeNull();
    expect(screen.queryByLabelText("Gültig bis Satzung 1")).toBeNull();
    expect(screen.getByLabelText("Nummer Satzung 1")).toBeRequired();

    fireEvent.click(screen.getByText("BDK 2027").closest("summary")!);
    const bdk = screen.getByRole("group", { name: "BDK 2" });
    expect(within(bdk).queryByLabelText("Status BDK 2")).toBeNull();
    expect(within(bdk).getByLabelText("Uhrzeit BDK 2")).not.toBeRequired();
    expect(within(bdk).getByLabelText("Ort BDK 2")).not.toBeRequired();
    expect(within(bdk).queryByLabelText("Neues Foto BDK 2")).toBeNull();
    expect(within(bdk).getByLabelText("Neuen Anhang BDK 2").closest("fieldset")).toHaveClass("about-editor-options-compact");
  });

  it("edits multiple photos inside a Vorstand record", async () => {
    const about = structuredClone(defaultAboutContent);
    about.boards[0] = {
      ...about.boards[0],
      photos: [
        { id: "vorstand-gruppe", alt: "Der Bezirksvorstand" },
        { id: "landesdelegierte", alt: "Die Landesdelegierten" },
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ about }) }));
    render(<AboutEditorialPanel />);
    await screen.findByLabelText("Aktiver Bezirksvorstand");

    fireEvent.click(screen.getByText(/Beginn: 2026-07-02/).closest("summary")!);
    const board = screen.getByRole("group", { name: "Vorstand 1" });
    expect(within(board).getByLabelText("Fotos Vorstand 1")).toHaveAttribute("multiple");
    expect(within(board).getByLabelText("Alternativtext Foto 1 Vorstand 1")).toHaveValue("Der Bezirksvorstand");
    expect(within(board).getByLabelText("Alternativtext Foto 2 Vorstand 1")).toHaveValue("Die Landesdelegierten");
    expect(within(board).getAllByRole("button", { name: /Foto entfernen/ })).toHaveLength(2);
  });
});
