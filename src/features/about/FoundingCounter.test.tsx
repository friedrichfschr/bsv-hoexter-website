// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FoundingCounter, foundingSentence } from "@/features/about/FoundingCounter";

describe("FoundingCounter", () => {
  it("formats a compact sentence and omits zero units", () => {
    expect(foundingSentence({ years: 1, months: 2, days: 0, hours: 4, minutes: 5, seconds: 7 })).toBe(
      "Vor 1 Jahr, 2 Monaten, 4 Stunden, 5 Minuten und 7 Sekunden wurde die BSV Höxter in Brakel gegründet.",
    );
  });

  it("renders the live founding sentence as the section heading", () => {
    render(<FoundingCounter date="2026-07-02" time="00:00" initialElapsed={{ years: 0, months: 1, days: 0, hours: 0, minutes: 2, seconds: 0 }} />);
    expect(screen.getByRole("heading", { level: 2, name: /Vor .* wurde die BSV Höxter in Brakel gegründet\./ })).toBeInTheDocument();
    expect(screen.queryByText("Die Gründung der BSV Höxter")).toBeNull();
  });
});