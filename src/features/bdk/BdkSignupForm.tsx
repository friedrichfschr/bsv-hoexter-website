"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { bdkGrades, bdkParticipationRoles, bdkRoleLabels } from "@/features/bdk/domain/signup";
import { bdkSchools } from "@/features/bdk/domain/schools";

export function BdkSignupForm() {
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
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
          firstName: data.get("firstName"),
          lastName: data.get("lastName"),
          grade: data.get("grade"),
          gradeOther: data.get("gradeOther") ?? "",
          email: data.get("email"),
          school: data.get("school"),
          schoolOther: data.get("schoolOther") ?? "",
          role: data.get("role"),
          message: data.get("message") ?? "",
          privacyAccepted: data.has("privacyAccepted"),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage({ kind: "error", text: result.error ?? "Die Anmeldung konnte nicht gesendet werden." });
        return;
      }
      form.reset();
      setSchool("");
      setGrade("");
      setMessage({ kind: "success", text: "Deine Anmeldung wurde gespeichert. Die BSV kann dich zu organisatorischen Fragen kontaktieren; eine automatische Bestätigungs-E-Mail wird derzeit nicht versendet." });
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
          <span>Vorname</span>
          <input name="firstName" type="text" maxLength={80} autoComplete="given-name" required />
        </label>
        <label className="form-field">
          <span>Nachname</span>
          <input name="lastName" type="text" maxLength={80} autoComplete="family-name" required />
        </label>
        <label className="form-field form-field-wide">
          <span>E-Mail-Adresse</span>
          <input name="email" type="email" maxLength={200} autoComplete="email" required />
        </label>
        <label className="form-field">
          <span>Schule</span>
          <select name="school" value={school} onChange={(event) => setSchool(event.target.value)} required>
            <option value="">Bitte auswählen</option>
            {bdkSchools.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            <option value="other">Andere Schule</option>
          </select>
        </label>
        <label className="form-field">
          <span>Jahrgangsstufe</span>
          <select name="grade" value={grade} onChange={(event) => setGrade(event.target.value)} required>
            <option value="">Bitte auswählen</option>
            {bdkGrades.filter((value) => value !== "other").map((value) => <option key={value} value={value}>{value}</option>)}
            <option value="other">Andere Jahrgangsstufe</option>
          </select>
        </label>
        {school === "other" ? (
          <label className="form-field">
            <span>Andere Schule</span>
            <input name="schoolOther" type="text" minLength={2} maxLength={180} autoComplete="organization" required />
          </label>
        ) : null}
        {grade === "other" ? (
          <label className="form-field">
            <span>Andere Jahrgangsstufe</span>
            <input name="gradeOther" type="text" maxLength={80} required />
          </label>
        ) : null}
        <label className="form-field form-field-wide">
          <span>Teilnahmerolle</span>
          <select name="role" required>
            <option value="">Bitte auswählen</option>
            {bdkParticipationRoles.map((role) => <option key={role} value={role}>{bdkRoleLabels[role]}</option>)}
          </select>
        </label>
      </div>

      <label className="form-field bdk-note-field">
        <span>Nachricht (optional)</span>
        <textarea name="message" maxLength={1500} rows={5} />
      </label>

      <label className="submission-consent">
        <input name="privacyAccepted" type="checkbox" required />
        <span>Ich habe die <Link href="/datenschutz">Datenschutzhinweise</Link> gelesen und stimme der Verarbeitung meiner Angaben zur Organisation der BDK zu.</span>
      </label>

      <button className="submission-submit" type="submit" disabled={submitting}>
        {submitting ? "Wird gesendet …" : "Verbindlich anmelden"}
      </button>
      {message ? <p className={`submission-message submission-message-${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p> : null}
    </form>
  );
}
