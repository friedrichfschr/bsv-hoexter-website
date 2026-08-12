"use client";

import { type FormEvent, useState } from "react";

export function BdkSignupForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string }>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/bdk-anmeldung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          school: data.get("school"),
          role: data.get("role"),
          note: data.get("note"),
          consent: data.has("consent"),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage({ kind: "error", text: result.error ?? "Die Anmeldung konnte nicht gesendet werden." });
        return;
      }
      form.reset();
      setMessage({ kind: "success", text: "Deine Anmeldung wurde vorgemerkt. Wir melden uns, sobald der Termin feststeht." });
    } catch {
      setMessage({ kind: "error", text: "Die Anmeldung konnte nicht gesendet werden." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="submission-form bdk-signup-form" onSubmit={submit}>
      <div className="submission-form-grid">
        <label className="form-field">
          <span>Name</span>
          <input name="name" type="text" minLength={2} maxLength={100} autoComplete="name" required />
        </label>
        <label className="form-field">
          <span>E-Mail-Adresse</span>
          <input name="email" type="email" maxLength={200} autoComplete="email" required />
        </label>
        <label className="form-field form-field-wide">
          <span>Schule</span>
          <input name="school" type="text" minLength={2} maxLength={150} autoComplete="organization" required />
        </label>
      </div>

      <fieldset className="submission-section">
        <legend>Wie möchtest du teilnehmen?</legend>
        <div className="bdk-role-options">
          <label className="submission-kind-option">
            <input name="role" type="radio" value="student-council" required />
            <span>Ich vertrete meine Schülervertretung</span>
          </label>
          <label className="submission-kind-option">
            <input name="role" type="radio" value="delegate" required />
            <span>Ich bin Delegierte oder Delegierter</span>
          </label>
          <label className="submission-kind-option">
            <input name="role" type="radio" value="interested" required />
            <span>Ich möchte zunächst mehr erfahren</span>
          </label>
        </div>
      </fieldset>

      <label className="form-field bdk-note-field">
        <span>Nachricht (optional)</span>
        <textarea name="note" maxLength={1500} rows={5} />
      </label>

      <label className="submission-consent">
        <input name="consent" type="checkbox" required />
        <span>Ich stimme zu, dass die BSV meine Angaben zur Organisation der nächsten BDK speichert und mich per E-Mail kontaktiert.</span>
      </label>

      <button className="submission-submit" type="submit" disabled={submitting}>
        {submitting ? "Wird gesendet …" : "Anmeldung vormerken"}
      </button>
      {message ? <p className={`submission-message submission-message-${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p> : null}
    </form>
  );
}
