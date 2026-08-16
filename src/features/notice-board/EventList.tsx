"use client";

import { useState } from "react";
import { eventSubmissionCategories } from "@/features/notice-board/domain/events";
import type { ModeratedEvent } from "@/features/notice-board/domain/moderation";

export function EventList({ events }: { events: ModeratedEvent[] }) {
  const [category, setCategory] = useState<string>("Alle");
  const visible = category === "Alle" ? events : events.filter((event) => event.category === category);

  return (
    <>
      <div className="notice-event-filters" role="group" aria-label="Veranstaltungen nach Kategorie filtern">
        {["Alle", ...eventSubmissionCategories].map((option) => (
          <button key={option} type="button" aria-pressed={category === option} onClick={() => setCategory(option)}>{option}</button>
        ))}
      </div>
      {visible.length === 0 ? <p className="notice-event-empty">{events.length === 0 ? "Aktuell sind keine Veranstaltungen freigegeben." : "In dieser Kategorie sind aktuell keine Veranstaltungen freigegeben."}</p> : (
        <div className="notice-event-list">
          {visible.map((event) => (
            <article className="notice-event" key={event.id}>
              <div className="notice-event-meta"><span>{event.category}</span><time dateTime={event.date}>{event.date.split("-").reverse().join(".")}</time></div>
              <h3>{event.title}</h3>
              <p>{event.description}</p>
              <dl>
                <div><dt>Ort</dt><dd>{event.location}</dd></div>
                <div><dt>Alter</dt><dd>{event.ageRange}</dd></div>
                <div><dt>Veranstalter</dt><dd>{event.organizer}</dd></div>
              </dl>
              <a href={event.website} target="_blank" rel="noreferrer">Zur Veranstaltungsseite</a>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
