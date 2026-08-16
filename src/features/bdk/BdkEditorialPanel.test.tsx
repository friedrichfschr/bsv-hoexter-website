import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BdkEditorialPanel } from "@/features/bdk/BdkEditorialPanel";

const state = {
  event: {
    id: "11111111-1111-4111-8111-111111111111",
    title: "BDK August",
    subtitle: "Gemeinsam gestalten",
    date: "2026-08-01",
    time: "10:00",
    location: "Brakel",
    invitationId: "",
    delegateKeyId: "",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
  },
  signups: [{
    id: "22222222-2222-4222-8222-222222222222",
    eventId: "11111111-1111-4111-8111-111111111111",
    eventTitle: "BDK August",
    eventDate: "2026-08-01",
    firstName: "Erika",
    lastName: "Muster",
    grade: "Q1",
    gradeOther: "",
    email: "erika@example.org",
    school: "schulen-der-brede-brakel",
    schoolOther: "",
    role: "district-delegate",
    message: "Hallo",
    privacyAccepted: true,
    status: "active",
    registeredAt: "2026-07-20T10:00:00.000Z",
    cancelledAt: "",
    confirmationSentAt: "",
    cancellationTokenHash: "",
  }],
  canPrepareNewEvent: true,
};

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

describe("BdkEditorialPanel", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows a retryable error when the initial load fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Netzwerkfehler"));
    render(<BdkEditorialPanel />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Netzwerkfehler"));
    expect(screen.getByRole("button", { name: "Erneut laden" })).toBeVisible();
  });

  it("edits the event and manages retained signups", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) return json(state);
      return json(init.method === "POST" ? { ...state, event: { ...state.event, id: "new", date: "" } } : state);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<BdkEditorialPanel />);

    expect(await screen.findByLabelText("Titel")).toHaveValue("BDK August");
    expect(screen.getByText("Erika Muster")).toBeInTheDocument();
    expect(screen.getByText("Aktiv")).toBeInTheDocument();
    expect(screen.getByLabelText("Einladung (PDF)")).toHaveAttribute("accept", "application/pdf");
    expect(screen.getByLabelText("Delegiertenschlüssel (PDF)")).toHaveAttribute("accept", "application/pdf");

    fireEvent.change(screen.getByLabelText("Ort"), { target: { value: "Höxter" } });
    fireEvent.click(screen.getByRole("button", { name: "BDK speichern" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/redaktion/bdk", expect.objectContaining({ method: "PUT" })));

    fireEvent.click(screen.getByRole("button", { name: "Absagen" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("22222222-2222-4222-8222-222222222222"), expect.objectContaining({ method: "PATCH" })));
    expect(screen.getByRole("link", { name: "Anmeldungen als XLSX exportieren" })).toHaveAttribute("href", "/api/redaktion/bdk/export");
    expect(screen.getByRole("button", { name: "Neue BDK vorbereiten" })).toBeInTheDocument();
  });
});
