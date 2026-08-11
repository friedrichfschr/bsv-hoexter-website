"use client";

import { FormEvent, useState } from "react";

export function EditorialLogin() {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/redaktion/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(typeof result.error === "string" ? result.error : "Anmeldung fehlgeschlagen.");
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  return (
    <section className="editorial-login shell" aria-labelledby="editorial-login-heading">
      <p className="news-eyebrow">Redaktion</p>
      <h1 id="editorial-login-heading">Anmelden</h1>
      <p>Der Redaktionsbereich ist nur für autorisierte Personen zugänglich.</p>
      <form className="editorial-form" onSubmit={submit}>
        <label htmlFor="editorial-key">Redaktionsschlüssel</label>
        <input id="editorial-key" name="key" type="password" autoComplete="current-password" value={key} onChange={(event) => setKey(event.target.value)} required />
        {error ? <p className="editorial-error" role="alert">{error}</p> : null}
        <button className="editorial-button" type="submit" disabled={busy}>{busy ? "Wird geprüft …" : "Anmelden"}</button>
      </form>
    </section>
  );
}
