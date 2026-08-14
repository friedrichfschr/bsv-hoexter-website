"use client";

import { useEffect, useState } from "react";
import { elapsedSinceFounding, type FoundingElapsed } from "@/lib/founding-time";

const units: Array<[keyof FoundingElapsed, string, string]> = [
  ["years", "Jahr", "Jahre"],
  ["months", "Monat", "Monate"],
  ["days", "Tag", "Tage"],
  ["hours", "Stunde", "Stunden"],
  ["minutes", "Minute", "Minuten"],
  ["seconds", "Sekunde", "Sekunden"],
];

export function FoundingCounter({ date, time }: { date: string; time: string }) {
  const [elapsed, setElapsed] = useState<FoundingElapsed>();

  useEffect(() => {
    const update = () => setElapsed(elapsedSinceFounding(date, time));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [date, time]);

  return <div className="about-founding-counter" aria-label="Zeit seit der Gründung" aria-live="off">
    <p>Seit unserer Gründung</p>
    {elapsed ? <div className="about-founding-counter-grid">{units.map(([key, singular, plural]) => <span key={key}><strong>{elapsed[key]}</strong><small>{elapsed[key] === 1 ? singular : plural}</small></span>)}</div> : <p><time dateTime={`${date}T${time}`}>{date.split("-").reverse().join(".")}</time></p>}
  </div>;
}
