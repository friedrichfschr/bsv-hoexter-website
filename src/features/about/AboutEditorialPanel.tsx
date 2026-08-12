"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { AboutContent } from "@/lib/about-schema";

const emptyBoard: AboutContent["boards"][number] = { id: "", term: "", startDate: "", endDate: "", message: "", photoId: "", photoAlt: "", status: "draft" };
const emptyBdk: AboutContent["bdks"][number] = { id: "", title: "", date: "", location: "", summary: "", documentIds: [], founding: false, status: "draft" };
const emptyDocument: AboutContent["documents"][number] = { id: "", title: "", kind: "sonstiges", date: "", status: "draft", mediaId: "", bundledFile: "", fileName: "" };

export function AboutEditorialPanel() {
  const [about, setAbout] = useState<AboutContent>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/redaktion/about", { cache: "no-store" }).then(async (response) => {
      if (response.status === 401) return window.location.reload();
      const result = await response.json();
      if (!active) return;
      if (!response.ok) setError(result.error ?? "Inhalte konnten nicht geladen werden.");
      else setAbout(result.about);
    }).catch(() => { if (active) setError("Inhalte konnten nicht geladen werden."); });
    return () => { active = false; };
  }, []);

  function updateCollection<K extends "boards" | "bdks" | "documents">(collection: K, index: number, value: AboutContent[K][number]) {
    if (!about) return;
    const values = [...about[collection]] as AboutContent[K];
    values[index] = value;
    setAbout({ ...about, [collection]: values });
  }

  function removeCollectionItem(collection: "boards" | "bdks" | "documents", index: number) {
    if (!about || !window.confirm("Diesen Datensatz wirklich entfernen?")) return;
    if (collection === "documents") {
      const documentId = about.documents[index]?.id;
      setAbout({
        ...about,
        documents: about.documents.filter((_, itemIndex) => itemIndex !== index),
        bdks: about.bdks.map((bdk) => ({ ...bdk, documentIds: bdk.documentIds.filter((id) => id !== documentId) })),
      });
      return;
    }
    if (collection === "boards") setAbout({ ...about, boards: about.boards.filter((_, itemIndex) => itemIndex !== index) });
    if (collection === "bdks") setAbout({ ...about, bdks: about.bdks.filter((_, itemIndex) => itemIndex !== index) });
  }

  async function upload(file: File | undefined) {
    if (!file) return "";
    const data = new FormData();
    data.set("file", file);
    const response = await fetch("/api/redaktion/upload", { method: "POST", body: data });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Datei konnte nicht hochgeladen werden.");
    return result.id as string;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!about) return;
    setSaving(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/redaktion/about", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(about) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Inhalte konnten nicht gespeichert werden.");
      setAbout(result.about); setMessage("Über-uns-Inhalte gespeichert.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Inhalte konnten nicht gespeichert werden."); }
    finally { setSaving(false); }
  }

  if (!about) return <p>{error || "Über-uns-Inhalte werden geladen …"}</p>;

  return <form className="editorial-form about-editorial" onSubmit={save}>
    <section><h2>Einleitung</h2><label htmlFor="about-intro">Was wir sind</label><textarea id="about-intro" rows={6} minLength={20} maxLength={12000} value={about.intro} onChange={(event) => setAbout({ ...about, intro: event.target.value })} required /><label htmlFor="about-values">Wofür wir stehen</label><textarea id="about-values" rows={6} minLength={20} maxLength={12000} value={about.values} onChange={(event) => setAbout({ ...about, values: event.target.value })} required /></section>

    <section><div className="editorial-form-heading"><h2>Bezirksvorstände</h2><button className="editorial-button editorial-button-secondary" type="button" onClick={() => setAbout({ ...about, boards: [...about.boards, { ...emptyBoard }] })}>Vorstand hinzufügen</button></div>{about.boards.map((board, index) => <fieldset key={`${board.id}-${index}`} className="about-editor-record"><legend>Vorstand {index + 1}</legend><button className="editorial-button editorial-button-danger about-editor-remove" type="button" onClick={() => removeCollectionItem("boards", index)}>Vorstand entfernen</button><div className="editorial-form-grid"><div><label>Datensatz-ID</label><input aria-label={`Datensatz-ID Vorstand ${index + 1}`} value={board.id} pattern="[a-z0-9-]+" onChange={(event) => updateCollection("boards", index, { ...board, id: event.target.value })} required /></div><div><label>Amtszeit</label><input aria-label={`Amtszeit Vorstand ${index + 1}`} value={board.term} onChange={(event) => updateCollection("boards", index, { ...board, term: event.target.value })} required /></div><div><label>Beginn</label><input aria-label={`Beginn Vorstand ${index + 1}`} type="date" value={board.startDate} onChange={(event) => updateCollection("boards", index, { ...board, startDate: event.target.value })} required /></div><div><label>Ende (optional)</label><input aria-label={`Ende Vorstand ${index + 1}`} type="date" value={board.endDate} onChange={(event) => updateCollection("boards", index, { ...board, endDate: event.target.value })} /></div><div><label>Status</label><select aria-label={`Status Vorstand ${index + 1}`} value={board.status} onChange={(event) => updateCollection("boards", index, { ...board, status: event.target.value as typeof board.status })}><option value="draft">Entwurf</option><option value="published">Veröffentlicht</option></select></div></div><label>Text des Bezirksvorstands</label><textarea aria-label={`Text Vorstand ${index + 1}`} rows={7} value={board.message} onChange={(event) => updateCollection("boards", index, { ...board, message: event.target.value })} /><label>Vorstandsfoto</label><input aria-label={`Vorstandsfoto ${index + 1}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => { try { const photoId = await upload(event.currentTarget.files?.[0]); if (photoId) updateCollection("boards", index, { ...board, photoId }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Upload fehlgeschlagen."); } }} /><label>Alternativtext des Fotos</label><input aria-label={`Alternativtext Vorstandsfoto ${index + 1}`} value={board.photoAlt} onChange={(event) => updateCollection("boards", index, { ...board, photoAlt: event.target.value })} /></fieldset>)}</section>

    <section><div className="editorial-form-heading"><h2>Dokumente und Satzungen</h2><button className="editorial-button editorial-button-secondary" type="button" onClick={() => setAbout({ ...about, documents: [...about.documents, { ...emptyDocument }] })}>Dokument hinzufügen</button></div>{about.documents.map((document, index) => <fieldset key={`${document.id}-${index}`} className="about-editor-record"><legend>Dokument {index + 1}</legend><button className="editorial-button editorial-button-danger about-editor-remove" type="button" onClick={() => removeCollectionItem("documents", index)}>Dokument entfernen</button><div className="editorial-form-grid"><div><label>ID</label><input aria-label={`ID Dokument ${index + 1}`} value={document.id} pattern="[a-z0-9-]+" onChange={(event) => updateCollection("documents", index, { ...document, id: event.target.value })} required /></div><div><label>Titel</label><input aria-label={`Titel Dokument ${index + 1}`} value={document.title} onChange={(event) => updateCollection("documents", index, { ...document, title: event.target.value })} required /></div><div><label>Art</label><select aria-label={`Art Dokument ${index + 1}`} value={document.kind} onChange={(event) => updateCollection("documents", index, { ...document, kind: event.target.value as typeof document.kind })}><option value="satzung">Satzung</option><option value="einladung">Einladung</option><option value="tagesordnung">Tagesordnung</option><option value="protokoll">Protokoll</option><option value="sonstiges">Sonstiges</option></select></div><div><label>Datum</label><input aria-label={`Datum Dokument ${index + 1}`} type="date" value={document.date} onChange={(event) => updateCollection("documents", index, { ...document, date: event.target.value })} required /></div><div><label>Status</label><select aria-label={`Status Dokument ${index + 1}`} value={document.status} onChange={(event) => updateCollection("documents", index, { ...document, status: event.target.value as typeof document.status })}><option value="draft">Entwurf</option><option value="published">Veröffentlicht</option></select></div><div><label>Dateiname</label><input aria-label={`Dateiname Dokument ${index + 1}`} value={document.fileName} onChange={(event) => updateCollection("documents", index, { ...document, fileName: event.target.value })} required /></div></div><label>PDF hochladen</label><input aria-label={`PDF Dokument ${index + 1}`} type="file" accept="application/pdf" onChange={async (event) => { try { const mediaId = await upload(event.currentTarget.files?.[0]); if (mediaId) updateCollection("documents", index, { ...document, mediaId, bundledFile: "" }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Upload fehlgeschlagen."); } }} /></fieldset>)}</section>

    <section><div className="editorial-form-heading"><h2>BDKs</h2><button className="editorial-button editorial-button-secondary" type="button" onClick={() => setAbout({ ...about, bdks: [...about.bdks, { ...emptyBdk }] })}>BDK hinzufügen</button></div>{about.bdks.map((bdk, index) => <fieldset key={`${bdk.id}-${index}`} className="about-editor-record"><legend>BDK {index + 1}</legend><button className="editorial-button editorial-button-danger about-editor-remove" type="button" onClick={() => removeCollectionItem("bdks", index)}>BDK entfernen</button><div className="editorial-form-grid"><div><label>ID</label><input aria-label={`ID BDK ${index + 1}`} value={bdk.id} pattern="[a-z0-9-]+" onChange={(event) => updateCollection("bdks", index, { ...bdk, id: event.target.value })} required /></div><div><label>Titel</label><input aria-label={`Titel BDK ${index + 1}`} value={bdk.title} onChange={(event) => updateCollection("bdks", index, { ...bdk, title: event.target.value })} required /></div><div><label>Datum</label><input aria-label={`Datum BDK ${index + 1}`} type="date" value={bdk.date} onChange={(event) => updateCollection("bdks", index, { ...bdk, date: event.target.value })} required /></div><div><label>Ort</label><input aria-label={`Ort BDK ${index + 1}`} value={bdk.location} onChange={(event) => updateCollection("bdks", index, { ...bdk, location: event.target.value })} required /></div><div><label>Status</label><select aria-label={`Status BDK ${index + 1}`} value={bdk.status} onChange={(event) => updateCollection("bdks", index, { ...bdk, status: event.target.value as typeof bdk.status })}><option value="draft">Entwurf</option><option value="published">Veröffentlicht</option></select></div><div><label><input aria-label={`Gründungs-BDK ${index + 1}`} type="checkbox" checked={bdk.founding} onChange={(event) => updateCollection("bdks", index, { ...bdk, founding: event.target.checked })} /> Gründungs-BDK</label></div></div><label>Zusammenfassung</label><textarea aria-label={`Zusammenfassung BDK ${index + 1}`} rows={5} value={bdk.summary} onChange={(event) => updateCollection("bdks", index, { ...bdk, summary: event.target.value })} required /><fieldset><legend>Zugeordnete Dokumente</legend>{about.documents.map((document) => <label key={document.id} className="submission-consent"><input type="checkbox" checked={bdk.documentIds.includes(document.id)} onChange={(event) => updateCollection("bdks", index, { ...bdk, documentIds: event.target.checked ? [...bdk.documentIds, document.id] : bdk.documentIds.filter((id) => id !== document.id) })} /><span>{document.title}</span></label>)}</fieldset></fieldset>)}</section>

    {message ? <p className="editorial-success" role="status">{message}</p> : null}{error ? <p className="editorial-error" role="alert">{error}</p> : null}<button className="editorial-button" type="submit" disabled={saving}>{saving ? "Wird gespeichert …" : "Alle Über-uns-Inhalte speichern"}</button>
  </form>;
}
