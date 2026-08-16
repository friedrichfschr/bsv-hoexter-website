"use client";

import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import type { BdkEvent } from "@/features/bdk/domain/event";
import { bdkRoleLabels } from "@/features/bdk/domain/signup";
import { bdkSchoolLabel } from "@/features/bdk/domain/schools";
import type { BdkSignupRecord, BdkState } from "@/features/bdk/domain/state";

type EditorialState = BdkState & { canPrepareNewEvent: boolean };
type DocumentKind = "invitation" | "delegate-key";

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Die Anfrage ist fehlgeschlagen.");
  return body;
}

export function BdkEditorialPanel() {
  const [data, setData] = useState<EditorialState>();
  const [event, setEvent] = useState<BdkEvent>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const next = await readJson<EditorialState>(await fetch("/api/redaktion/bdk"));
    setData(next);
    setEvent(next.event);
  }

  function retryLoad() {
    setMessage("");
    void load().catch((error: Error) => setMessage(error.message));
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/redaktion/bdk")
      .then((response) => readJson<EditorialState>(response))
      .then((next) => {
        if (!active) return;
        setData(next);
        setEvent(next.event);
      })
      .catch((error: Error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, []);

  function field(name: keyof BdkEvent) {
    return (change: ChangeEvent<HTMLInputElement>) => setEvent((current) => current ? { ...current, [name]: change.target.value } : current);
  }

  async function save(submit: FormEvent) {
    submit.preventDefault();
    if (!event) return;
    setBusy(true);
    setMessage("");
    try {
      const next = await readJson<EditorialState>(await fetch("/api/redaktion/bdk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: event.title, subtitle: event.subtitle, date: event.date, time: event.time, location: event.location }),
      }));
      setData(next);
      setEvent(next.event);
      setMessage("BDK gespeichert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "BDK konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(kind: DocumentKind, file?: File) {
    if (!file) return;
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    setBusy(true);
    try {
      await readJson(await fetch("/api/redaktion/bdk/upload", { method: "POST", body: form }));
      await load();
      setMessage("PDF gespeichert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PDF konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function removeDocument(kind: DocumentKind) {
    setBusy(true);
    try {
      const response = await fetch(`/api/redaktion/bdk/upload?kind=${kind}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Dokument konnte nicht entfernt werden.");
      await load();
      setMessage("Dokument entfernt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dokument konnte nicht entfernt werden.");
    } finally {
      setBusy(false);
    }
  }

  async function changeSignup(signup: BdkSignupRecord, action: "status" | "delete") {
    const deleting = action === "delete";
    if (deleting && !window.confirm("Diese Anmeldung endgültig löschen?")) return;
    const method = deleting ? "DELETE" : "PATCH";
    const body = deleting ? undefined : JSON.stringify({ status: signup.status === "active" ? "cancelled" : "active" });
    setBusy(true);
    setMessage("");
    try {
      const next = await readJson<EditorialState>(await fetch(`/api/redaktion/bdk/signups/${signup.id}`, {
        method,
        ...(body ? { headers: { "Content-Type": "application/json" }, body } : {}),
      }));
      setData(next);
      setEvent(next.event);
      setMessage(deleting ? "Anmeldung gelöscht." : "Anmeldestatus gespeichert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Anmeldung konnte nicht geändert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function prepareNewEvent() {
    if (!window.confirm("Eine neue BDK ohne die bisherigen PDFs vorbereiten?")) return;
    setBusy(true);
    setMessage("");
    try {
      const next = await readJson<EditorialState>(await fetch("/api/redaktion/bdk", { method: "POST" }));
      setData(next);
      setEvent(next.event);
      setMessage("Neue BDK vorbereitet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Neue BDK konnte nicht vorbereitet werden.");
    } finally {
      setBusy(false);
    }
  }

  if (!data || !event) return (
    <div>
      <p role="status">{message || "BDK-Daten werden geladen …"}</p>
      {message ? <button className="editorial-button" type="button" onClick={retryLoad}>Erneut laden</button> : null}
    </div>
  );

  return (
    <section className="editorial-workspace bdk-editorial" aria-labelledby="bdk-editor-heading">
      <form className="editorial-form editorial-editor" onSubmit={save} aria-label="BDK verwalten">
        <h2 id="bdk-editor-heading">Nächste BDK</h2>
        <div className="editorial-form-grid">
          <label className="form-field form-field-wide"><span>Titel</span><input value={event.title} onChange={field("title")} minLength={3} maxLength={180} required /></label>
          <label className="form-field form-field-wide"><span>Untertitel (optional)</span><input value={event.subtitle} onChange={field("subtitle")} maxLength={300} /></label>
          <label className="form-field"><span>Datum</span><input type="date" value={event.date} onChange={field("date")} /></label>
          <label className="form-field"><span>Uhrzeit</span><input type="time" value={event.time} onChange={field("time")} /></label>
          <label className="form-field form-field-wide"><span>Ort</span><input value={event.location} onChange={field("location")} maxLength={180} /></label>
        </div>
        <div className="bdk-document-editors">
          <DocumentEditor label="Einladung (PDF)" present={Boolean(event.invitationId)} disabled={busy} onUpload={(file) => upload("invitation", file)} onRemove={() => removeDocument("invitation")} />
          <DocumentEditor label="Delegiertenschlüssel (PDF)" present={Boolean(event.delegateKeyId)} disabled={busy} onUpload={(file) => upload("delegate-key", file)} onRemove={() => removeDocument("delegate-key")} />
        </div>
        <div className="editorial-actions">
          <button className="editorial-button" type="submit" disabled={busy}>BDK speichern</button>
          {data.canPrepareNewEvent ? <button className="editorial-button editorial-button-secondary" type="button" disabled={busy} onClick={prepareNewEvent}>Neue BDK vorbereiten</button> : null}
        </div>
      </form>

      <section className="bdk-signup-admin" aria-labelledby="bdk-signups-heading">
        <div className="editorial-section-heading">
          <div><h2 id="bdk-signups-heading">Anmeldungen</h2><p>{data.signups.length} gespeicherte Datensätze</p></div>
          <a className="editorial-button editorial-button-secondary" href="/api/redaktion/bdk/export">Anmeldungen als XLSX exportieren</a>
        </div>
        <div className="bdk-signup-list">
          {data.signups.map((signup) => (
            <article key={signup.id} className="editorial-card">
              <div><h3>{signup.firstName} {signup.lastName}</h3><span className={`bdk-signup-status bdk-signup-status-${signup.status}`}>{signup.status === "active" ? "Aktiv" : "Abgesagt"}</span></div>
              <p>{signup.eventTitle}{signup.eventDate ? ` · ${signup.eventDate}` : ""}</p>
              <p>{bdkSchoolLabel(signup.school, signup.schoolOther)} · {signup.grade === "other" ? signup.gradeOther : signup.grade} · {bdkRoleLabels[signup.role]}</p>
              <p><a href={`mailto:${signup.email}`}>{signup.email}</a></p>
              {signup.message ? <p>{signup.message}</p> : null}
              <div className="editorial-actions">
                <button className="editorial-button editorial-button-secondary" type="button" disabled={busy} onClick={() => changeSignup(signup, "status")}>{signup.status === "active" ? "Absagen" : "Reaktivieren"}</button>
                <button className="editorial-button editorial-button-danger" type="button" disabled={busy} onClick={() => changeSignup(signup, "delete")}>Löschen</button>
              </div>
            </article>
          ))}
          {data.signups.length === 0 ? <p>Noch keine Anmeldungen.</p> : null}
        </div>
      </section>
      {message ? <p className="submission-message" role="status">{message}</p> : null}
    </section>
  );
}

function DocumentEditor({ label, present, disabled, onUpload, onRemove }: { label: string; present: boolean; disabled: boolean; onUpload: (file?: File) => void; onRemove: () => void }) {
  return (
    <div className="editorial-card">
      <label className="form-field"><span>{label}</span><input type="file" accept="application/pdf" disabled={disabled} onChange={(event) => onUpload(event.target.files?.[0])} /></label>
      <p>{present ? "PDF vorhanden" : "Noch keine PDF hinterlegt"}</p>
      {present ? <button className="editorial-button editorial-button-danger" type="button" disabled={disabled} onClick={onRemove}>PDF entfernen</button> : null}
    </div>
  );
}
