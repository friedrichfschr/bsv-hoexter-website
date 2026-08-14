"use client";

import { useEffect, useState } from "react";
import { elapsedSinceFounding, type FoundingElapsed } from "@/lib/founding-time";

const units: Array<[keyof FoundingElapsed, string, string]> = [
  ["years", "Jahr", "Jahren"],
  ["months", "Monat", "Monaten"],
  ["days", "Tag", "Tagen"],
  ["hours", "Stunde", "Stunden"],
  ["minutes", "Minute", "Minuten"],
  ["seconds", "Sekunde", "Sekunden"],
];

export function foundingDuration(elapsed: FoundingElapsed) {
  const parts = units
    .filter(([key]) => elapsed[key] !== 0)
    .map(([key, singular, plural]) => `${elapsed[key]} ${elapsed[key] === 1 ? singular : plural}`);
  if (!parts.length) parts.push("0 Sekunden");
  const duration = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} und ${parts.at(-1)}`;
  return duration;
}

export function FoundingCounter({ date, time, initialElapsed }: { date: string; time: string; initialElapsed: FoundingElapsed }) {
  const [elapsed, setElapsed] = useState(initialElapsed);

  useEffect(() => {
    const update = () => setElapsed(elapsedSinceFounding(date, time));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [date, time]);

  return <div className="about-founding-timer">
    <p className="about-founding-context">Vor</p>
    <h2 id="founding-heading" className="about-founding-counter" aria-live="off">
      {foundingDuration(elapsed)}
    </h2>
    <p className="about-founding-context">wurde die BSV Höxter in Brakel gegründet.</p>
  </div>;
}
