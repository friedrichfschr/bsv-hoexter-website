"use client";

import { type FormEvent, useEffect, useState } from "react";
import { eventSubmissionCategories } from "@/features/notice-board/domain/events";
import type { ModeratedEvent, NoticeBoardContent } from "@/features/notice-board/domain/moderation";

const statusLabels = { pending: "Ausstehend", approved: "Freigegeben", rejected: "Abgelehnt" } as const;

type EventValues = Pick<ModeratedEvent, "title" | "description" | "date" | "location" | "ageRange" | "website" | "organizer" | "category" | "status">;

export function EventModerationPanel() {
  const [events, setEvents] = useState<ModeratedEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [values, setValues] = useState<EventValues>();
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/redaktion/notice-board", { cache: "no-store" });
    if (response.status === 401) return window.location.reload();
    const result = await response.json() as NoticeBoardContent;
    setEvents(result.events ?? []);
    setBusy(false);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/redaktion/notice-board", { cache: "no-store" }).then(async (response) => {
      if (response.status === 401) return window.location.reload();
      const result = await response.json() as NoticeBoardContent;
      if (!active) return;
      setEvents(result.events ?? []);
      setBusy(false);
    });
    return () => { active = false; };
  }, []);

  function select(event: ModeratedEvent) {
    setSelectedId(event.id);
    setValues({
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      ageRange: event.ageRange,
      website: event.website,
      organizer: event.organizer,
      category: event.category,
      status: event.status,
    });
    setMessage("");
    setError("");
  }

  function update<K extends keyof EventValues>(field: K, value: EventValues[K]) {
    setValues((current) => current ? { ...current, [field]: value } : current);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !values) return;
    setSaving(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/redaktion/notice-board/events/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(typeof result.error === "string" ? result.error : "Veranstaltung konnte nicht gespeichert werden.");
    else {
      setMessage(values.status === "approved" ? "Veranstaltung freigegeben." : "Veranstaltung gespeichert.");
      await load();
    }
    setSaving(false);
  }

  if (busy) return <p>Veranstaltungen werden geladen …</p>;
  const selected = events.find((event) => event.id === selectedId);
  const reviewEvents = events.filter((event) => event.status !== "rejected");
  const rejectedEvents = events.filter((event) => event.status === "rejected");

  return (
    <div className="editorial-layout">
      <aside className="editorial-article-list" aria-label="Veranstaltungseinträge">
        <h2>Veranstaltungseinträge</h2>
        {reviewEvents.length === 0 ? <p className="editorial-muted">Noch keine offenen oder freigegebenen Einreichungen.</p> : (
          <ul>
            {reviewEvents.map((event) => (
              <li key={event.id}>
                <button className={event.id === selectedId ? "editorial-article-link editorial-article-link-active" : "editorial-article-link"} type="button" onClick={() => select(event)}>
                  <strong>{event.title}</strong>
                  <span>{statusLabels[event.status]} · {event.date}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      {values ? (
        <form aria-label="Veranstaltung moderieren" className="editorial-form editorial-editor" onSubmit={save}>
          <div className="editorial-form-heading">
            <h2>Veranstaltung prüfen und korrigieren</h2>
            <p className="editorial-muted">Änderungen werden erst mit dem Status „Freigegeben“ öffentlich sichtbar.</p>
          </div>
          {selected ? <p className="editorial-contact">Kontakt: <a href={`mailto:${selected.contactEmail}`}>{selected.contactEmail}</a>{selected.contactName ? ` · ${selected.contactName}` : ""}</p> : null}
          <label htmlFor="moderation-event-title">Titel</label>
          <input id="moderation-event-title" value={values.title} onChange={(event) => update("title", event.target.value)} required minLength={4} maxLength={120} />
          <label htmlFor="moderation-event-description">Beschreibung</label>
          <textarea id="moderation-event-description" value={values.description} onChange={(event) => update("description", event.target.value)} required minLength={20} maxLength={1500} rows={7} />
          <div className="editorial-form-grid">
            <div>
              <label htmlFor="moderation-event-date">Datum</label>
              <input id="moderation-event-date" type="date" value={values.date} onChange={(event) => update("date", event.target.value)} required />
            </div>
            <div>
              <label htmlFor="moderation-event-category">Kategorie</label>
              <select id="moderation-event-category" value={values.category} onChange={(event) => update("category", event.target.value as EventValues["category"])}>
                {eventSubmissionCategories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="moderation-event-location">Ort</label>
              <input id="moderation-event-location" value={values.location} onChange={(event) => update("location", event.target.value)} required maxLength={160} />
            </div>
            <div>
              <label htmlFor="moderation-event-age">Altersspanne</label>
              <input id="moderation-event-age" value={values.ageRange} onChange={(event) => update("ageRange", event.target.value)} required maxLength={100} />
            </div>
            <div>
              <label htmlFor="moderation-event-organizer">Veranstalter</label>
              <input id="moderation-event-organizer" value={values.organizer} onChange={(event) => update("organizer", event.target.value)} required maxLength={120} />
            </div>
            <div>
              <label htmlFor="moderation-event-status">Status</label>
              <select id="moderation-event-status" value={values.status} onChange={(event) => update("status", event.target.value as EventValues["status"])}>
                <option value="pending">Ausstehend</option>
                <option value="approved">Freigegeben</option>
                <option value="rejected">Abgelehnt</option>
              </select>
            </div>
          </div>
          <label htmlFor="moderation-event-website">Website</label>
          <input id="moderation-event-website" type="url" value={values.website} onChange={(event) => update("website", event.target.value)} required maxLength={500} />
          {message ? <p className="editorial-success" role="status">{message}</p> : null}
          {error ? <p className="editorial-error" role="alert">{error}</p> : null}
          <button className="editorial-button" type="submit" disabled={saving}>{saving ? "Wird gespeichert …" : "Speichern"}</button>
        </form>
      ) : <p className="editorial-muted">Wähle links eine Veranstaltung zur Prüfung aus.</p>}
      <section className="editorial-rejected-section" aria-labelledby="rejected-events-heading">
        <h2 id="rejected-events-heading">Abgelehnte Veranstaltungen</h2>
        <p className="editorial-muted">Wird 30 Tage nach Ablehnung automatisch gelöscht.</p>
        {rejectedEvents.length === 0 ? <p className="editorial-muted">Keine abgelehnten Einträge.</p> : <ul className="editorial-rejected-list">{rejectedEvents.map((event) => (
          <li key={event.id}><button className={event.id === selectedId ? "editorial-article-link editorial-article-link-active" : "editorial-article-link"} type="button" onClick={() => select(event)}><strong>{event.title}</strong><span>Abgelehnt · {event.date}</span></button></li>
        ))}</ul>}
      </section>
    </div>
  );
}
