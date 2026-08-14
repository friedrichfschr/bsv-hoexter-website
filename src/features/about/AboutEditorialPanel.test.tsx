// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AboutEditorialPanel } from "@/features/about/AboutEditorialPanel";
import { defaultAboutContent } from "@/lib/about-schema";

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

  it("does not expose publication controls for Satzungen", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ about: defaultAboutContent }) }));
    render(<AboutEditorialPanel />);
    await screen.findByLabelText("Aktiver Bezirksvorstand");
    expect(screen.queryByLabelText("Status Dokument 1")).toBeNull();
  });
});
