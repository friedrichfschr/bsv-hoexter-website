// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FoundingCounter, foundingDuration } from "@/features/about/FoundingCounter";

describe("FoundingCounter", () => {
  it("formats a compact duration and omits zero units", () => {
    expect(foundingDuration({ years: 1, months: 0, days: 2, hours: 1, minutes: 0, seconds: 3 })).toBe(
      "1 Jahr, 2 Tagen, 1 Stunde und 3 Sekunden",
    );
  });

  it("renders the live duration as the section heading", () => {
    render(<FoundingCounter date="2026-07-02" time="00:00" initialElapsed={{ years: 0, months: 1, days: 0, hours: 0, minutes: 2, seconds: 0 }} />);
    const heading = screen.getByRole("heading", { level: 2, name: /^\d+ (Jahr|Jahre|Monat|Monate|Tag|Tage|Stunde|Stunden|Minute|Minuten|Sekunde|Sekunden)/ });
    expect(heading).toBeInTheDocument();
    expect(heading).not.toHaveTextContent(/Vor|gegründet/);
    expect(screen.getByText("Vor")).toBeInTheDocument();
    expect(screen.getByText("wurde die BSV Höxter in Brakel gegründet.")).toBeInTheDocument();
    expect(screen.queryByText("Die Gründung der BSV Höxter")).toBeNull();
  });
});