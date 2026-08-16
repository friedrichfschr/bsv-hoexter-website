import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BdkSignupForm } from "@/features/bdk/BdkSignupForm";

describe("BdkSignupForm", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders bounded signup choices and conditional detail fields", () => {
    render(<BdkSignupForm />);
    expect(screen.getByLabelText("Vorname")).toBeRequired();
    expect(screen.getByLabelText("Nachname")).toBeRequired();
    expect(screen.getByRole("option", { name: "Q2" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Schulen der Brede Brakel" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "LSV-Mitglied" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Andere Schule")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Andere Jahrgangsstufe")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Schule"), { target: { value: "other" } });
    fireEvent.change(screen.getByLabelText("Jahrgangsstufe"), { target: { value: "other" } });
    expect(screen.getByLabelText("Andere Schule")).toBeRequired();
    expect(screen.getByLabelText("Andere Jahrgangsstufe")).toBeRequired();
    expect(screen.getByRole("link", { name: "Datenschutzhinweise" })).toHaveAttribute("href", "/datenschutz");
  });

  it("submits the structured registration without claiming an email was sent", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ id: "record" }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    })));
    vi.stubGlobal("fetch", fetchMock);
    render(<BdkSignupForm />);

    fireEvent.change(screen.getByLabelText("Vorname"), { target: { value: "Erika" } });
    fireEvent.change(screen.getByLabelText("Nachname"), { target: { value: "Muster" } });
    fireEvent.change(screen.getByLabelText("E-Mail-Adresse"), { target: { value: "erika@example.org" } });
    fireEvent.change(screen.getByLabelText("Schule"), { target: { value: "other" } });
    fireEvent.change(screen.getByLabelText("Andere Schule"), { target: { value: "Freie Schule" } });
    fireEvent.change(screen.getByLabelText("Jahrgangsstufe"), { target: { value: "other" } });
    fireEvent.change(screen.getByLabelText("Andere Jahrgangsstufe"), { target: { value: "Ausbildung" } });
    fireEvent.change(screen.getByLabelText("Teilnahmerolle"), { target: { value: "guest" } });
    fireEvent.click(screen.getByLabelText(/Datenschutzhinweise gelesen/));
    fireEvent.click(screen.getByRole("button", { name: "Verbindlich anmelden" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(options.body))).toEqual({
      firstName: "Erika",
      lastName: "Muster",
      grade: "other",
      gradeOther: "Ausbildung",
      email: "erika@example.org",
      school: "other",
      schoolOther: "Freie Schule",
      role: "guest",
      message: "",
      privacyAccepted: true,
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Anmeldung wurde gespeichert");
    expect(screen.getByRole("status")).not.toHaveTextContent(/E-Mail.*gesendet/i);
  });
});
