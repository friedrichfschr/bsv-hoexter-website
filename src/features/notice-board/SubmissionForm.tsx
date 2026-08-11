"use client";

import { useState, type FormEvent } from "react";
import { eventSubmissionCategories } from "@/domain/events";
import { submissionIncludesEvent, submissionRequiresPoster, type SubmissionKind } from "@/lib/submission";

const submissionOptions: readonly { value: SubmissionKind; label: string }[] = [
  { value: "poster", label: "Nur Poster" },
  { value: "event", label: "Nur Veranstaltung" },
  { value: "both", label: "Poster und Veranstaltung" },
];

export function SubmissionForm() {
  const [submissionKind, setSubmissionKind] = useState<SubmissionKind>("both");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string }>();
  const includesEvent = submissionIncludesEvent(submissionKind);
  const requiresPoster = submissionRequiresPoster(submissionKind);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    body.set("submissionKind", submissionKind);
    body.set("consent", body.has("consent") ? "true" : "false");
    setSubmitting(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/einreichen", { method: "POST", body });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage({ kind: "error", text: result.error ?? "Die Einreichung konnte nicht gesendet werden." });
        return;
      }
      form.reset();
      setSubmissionKind("both");
      setMessage({ kind: "success", text: "Die Einreichung wurde zur Prüfung übermittelt." });
    } catch {
      setMessage({ kind: "error", text: "Die Einreichung konnte nicht gesendet werden." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="submission-form" onSubmit={submit}>
      <fieldset className="submission-kind-fieldset">
        <legend>Was möchtest du einreichen?</legend>
        <div className="submission-kind-options">
          {submissionOptions.map((option) => (
            <label className="submission-kind-option" key={option.value}>
              <input
                type="radio"
                name="submissionKind"
                value={option.value}
                checked={submissionKind === option.value}
                onChange={() => setSubmissionKind(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="submission-form-grid">
        <label className="form-field">
          <span>Titel</span>
          <input name="title" type="text" minLength={4} maxLength={120} required />
        </label>
        <label className="form-field">
          <span>E-Mail-Adresse</span>
          <input name="contactEmail" type="email" maxLength={200} autoComplete="email" required />
        </label>
      </div>

      {requiresPoster ? (
        <fieldset className="submission-section">
          <legend>Poster</legend>
          <label className="form-field">
            <span>Posterdatei</span>
            <input name="posterFile" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" required />
            <small>PNG, JPEG, WebP oder PDF, maximal 5 MB</small>
          </label>
        </fieldset>
      ) : null}

      {includesEvent ? (
        <fieldset className="submission-section">
          <legend>Veranstaltung</legend>
          <div className="submission-form-grid">
            <label className="form-field form-field-wide">
              <span>Beschreibung</span>
              <textarea name="description" minLength={20} maxLength={1500} rows={6} required />
            </label>
            <label className="form-field">
              <span>Datum</span>
              <input name="date" type="date" required />
            </label>
            <label className="form-field">
              <span>Ort</span>
              <input name="location" type="text" maxLength={160} required />
            </label>
            <label className="form-field">
              <span>Altersspanne</span>
              <input name="ageRange" type="text" maxLength={100} required />
            </label>
            <label className="form-field">
              <span>Kategorie</span>
              <select name="category" defaultValue="" required>
                <option value="" disabled>Kategorie auswählen</option>
                {eventSubmissionCategories.map((category) => <option value={category} key={category}>{category}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Website</span>
              <input name="website" type="url" maxLength={500} placeholder="https://" required />
            </label>
            <label className="form-field">
              <span>Veranstalter</span>
              <input name="organizer" type="text" maxLength={120} required />
            </label>
          </div>
        </fieldset>
      ) : null}

      <label className="submission-consent">
        <input name="consent" type="checkbox" value="true" required />
        <span>Ich bestätige, dass die Angaben geprüft werden dürfen und die BSV mich per E-Mail kontaktieren darf.</span>
      </label>

      <button className="submission-submit" type="submit" disabled={submitting}>
        {submitting ? "Wird gesendet …" : "Einreichung senden"}
      </button>

      {message ? <p className={`submission-message submission-message-${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p> : null}
    </form>
  );
}
