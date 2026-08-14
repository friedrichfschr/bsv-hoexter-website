"use client";

import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import type { AboutContent } from "@/lib/about-schema";

const emptyBoard: AboutContent["boards"][number] = { id: "", term: "", startDate: "", endDate: "", message: "", photoId: "", photoAlt: "", status: "published" };
const emptyBdk: AboutContent["bdks"][number] = { id: "", title: "", subtitle: "", date: "", time: "", location: "", summary: "", documentIds: [], photoIds: [], links: [], status: "published", founding: false };
const emptyDocument: AboutContent["documents"][number] = { id: "", title: "", kind: "sonstiges", date: "", number: "", effectiveFrom: "", effectiveUntil: "", status: "published", mediaId: "", bundledFile: "", fileName: "" };


type Collection = "boards" | "bdks" | "documents" | "media";


function FieldLabel({ children, hint }: { children: ReactNode; hint: string }) {
  return <span className="about-field-label"><span>{children}</span><small>{hint}</small></span>;
}

export function AboutEditorialPanel() {
  const [about, setAbout] = useState<AboutContent>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const pendingUploads = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    const uploads = pendingUploads.current;
    fetch("/api/redaktion/about", { cache: "no-store" }).then(async (response) => {
      if (response.status === 401) return window.location.reload();
      const result = await response.json();
      if (!active) return;
      if (!response.ok) setError(result.error ?? "Inhalte konnten nicht geladen werden.");
      else setAbout(result.about);
    }).catch(() => { if (active) setError("Inhalte konnten nicht geladen werden."); });
    return () => {
      active = false;
      for (const id of uploads) fetch(`/api/redaktion/upload?id=${encodeURIComponent(id)}`, { method: "DELETE", keepalive: true }).catch(() => undefined);
    };
  }, []);

  function updateCollection<K extends Collection>(collection: K, index: number, value: AboutContent[K][number]) {
    if (!about) return;
    const values = [...about[collection]] as AboutContent[K];
    values[index] = value;
    setAbout({ ...about, [collection]: values });
  }

  function selectActiveBoard(id: string) {
    if (!about) return;
    const active = about.boards.find((board) => board.id === id);
    setAbout({ ...about, activeBoardId: id, boards: active ? [active, ...about.boards.filter((board) => board.id !== id)] : about.boards });
  }

  function updateBoardId(index: number, id: string) {
    if (!about) return;
    const previousId = about.boards[index].id;
    const boards = [...about.boards];
    boards[index] = { ...boards[index], id };
    setAbout({ ...about, activeBoardId: about.activeBoardId === previousId ? id : about.activeBoardId, boards });
  }

  async function discardPending(id: string) {
    if (!pendingUploads.current.delete(id)) return;
    await fetch(`/api/redaktion/upload?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined);
  }

  function removeCollectionItem(collection: Collection, index: number) {
    if (!about || !window.confirm("Diesen Datensatz wirklich entfernen?")) return;
    const item = about[collection][index];
    if (collection === "documents") {
      const document = item as AboutContent["documents"][number];
      void discardPending(document.mediaId);
      setAbout({
        ...about,
        documents: about.documents.filter((_, itemIndex) => itemIndex !== index),
        bdks: about.bdks.map((bdk) => ({ ...bdk, documentIds: bdk.documentIds.filter((id) => id !== document.id) })),
      });
      return;
    }
    if (collection === "boards") {
      const board = item as AboutContent["boards"][number];
      void discardPending(board.photoId);
      setAbout({ ...about, activeBoardId: about.activeBoardId === board.id ? "" : about.activeBoardId, boards: about.boards.filter((_, itemIndex) => itemIndex !== index) });
    }
    if (collection === "bdks") {
      const bdk = item as AboutContent["bdks"][number];
      const bdks = about.bdks.filter((_, itemIndex) => itemIndex !== index);
      const retainedDocumentIds = new Set(bdks.flatMap((entry) => entry.documentIds));
      const retainedPhotoIds = new Set(bdks.flatMap((entry) => entry.photoIds));
      const removedDocuments = about.documents.filter((document) => bdk.documentIds.includes(document.id) && document.kind !== "satzung" && !retainedDocumentIds.has(document.id));
      const removedMedia = about.media.filter((media) => bdk.photoIds.includes(media.id) && !retainedPhotoIds.has(media.id));
      for (const document of removedDocuments) void discardPending(document.mediaId);
      for (const media of removedMedia) void discardPending(media.mediaId);
      setAbout({
        ...about,
        bdks,
        documents: about.documents.filter((document) => !removedDocuments.includes(document)),
        media: about.media.filter((media) => !removedMedia.includes(media)),
      });
    }
    if (collection === "media") {
      const media = item as AboutContent["media"][number];
      void discardPending(media.mediaId);
      setAbout({ ...about, media: about.media.filter((_, itemIndex) => itemIndex !== index), bdks: about.bdks.map((bdk) => ({ ...bdk, photoIds: bdk.photoIds.filter((id) => id !== media.id) })) });
    }
  }

  async function upload(file: File | undefined, replacedId = "") {
    if (!file) return replacedId;
    const data = new FormData();
    data.set("file", file);
    const response = await fetch("/api/redaktion/upload", { method: "POST", body: data });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Datei konnte nicht hochgeladen werden.");
    await discardPending(replacedId);
    pendingUploads.current.add(result.id as string);
    return result.id as string;
  }

  async function addBdkDocument(index: number, file: File | undefined) {
    if (!about || !file) return;
    const mediaId = await upload(file);
    const bdk = about.bdks[index];
    const id = `bdk-dokument-${mediaId}`;
    const title = file.name.replace(/\.pdf$/i, "");
    setAbout({
      ...about,
      documents: [...about.documents, { ...emptyDocument, id, title, kind: "sonstiges", date: bdk.date, effectiveFrom: bdk.date, fileName: file.name, mediaId, status: bdk.status }],
      bdks: about.bdks.map((item, itemIndex) => itemIndex === index ? { ...item, documentIds: [...item.documentIds, id] } : item),
    });
  }


  function updateDocument(id: string, value: AboutContent["documents"][number]) {
    if (about) setAbout({ ...about, documents: about.documents.map((document) => document.id === id ? value : document) });
  }


  function addStatute() {
    if (!about) return;
    let number = about.documents.length + 1;
    while (about.documents.some((document) => document.id === `satzung-${number}`)) number += 1;
    setAbout({ ...about, documents: [...about.documents, { ...emptyDocument, id: `satzung-${number}`, kind: "satzung", status: "published" }] });
  }

  function detachBdkDocument(index: number, id: string) {
    if (!about) return;
    const stillUsed = about.bdks.some((bdk, itemIndex) => itemIndex !== index && bdk.documentIds.includes(id));
    const document = about.documents.find((item) => item.id === id);
    if (!stillUsed && document?.kind !== "satzung") void discardPending(document?.mediaId ?? "");
    setAbout({
      ...about,
      bdks: about.bdks.map((bdk, itemIndex) => itemIndex === index ? { ...bdk, documentIds: bdk.documentIds.filter((item) => item !== id) } : bdk),
      documents: stillUsed || document?.kind === "satzung" ? about.documents : about.documents.filter((item) => item.id !== id),
    });
  }


  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!about) return;
    setSaving(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/redaktion/about", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(about) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Inhalte konnten nicht gespeichert werden.");
      pendingUploads.current.clear();
      setAbout(result.about); setMessage("Über-uns-Inhalte gespeichert.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Inhalte konnten nicht gespeichert werden."); }
    finally { setSaving(false); }
  }

  if (!about) return <p>{error || "Über-uns-Inhalte werden geladen …"}</p>;

  return <form className="editorial-form about-editorial" onSubmit={save}>
    <section>
      <h2>Einleitung</h2>
      <label htmlFor="about-intro"><FieldLabel hint="Pflichtfeld · 20–12.000 Zeichen">Was wir sind</FieldLabel></label>
      <textarea id="about-intro" rows={5} minLength={20} maxLength={12000} value={about.intro} onChange={(event) => setAbout({ ...about, intro: event.target.value })} required />
      <label htmlFor="about-values"><FieldLabel hint="Pflichtfeld · 20–12.000 Zeichen">Wofür wir stehen</FieldLabel></label>
      <textarea id="about-values" rows={5} minLength={20} maxLength={12000} value={about.values} onChange={(event) => setAbout({ ...about, values: event.target.value })} required />
    </section>

    <section>
      <div className="editorial-form-heading"><h2>Bezirksvorstände</h2><button className="editorial-button editorial-button-secondary" type="button" onClick={() => setAbout({ ...about, boards: [...about.boards, { ...emptyBoard }] })}>Vorstand hinzufügen</button></div>
      <div className="about-active-board">
        <div><strong>Aktiver Bezirksvorstand</strong><span>Nur diese Auswahl ist aktuell. Alle anderen Vorstände erscheinen nach Beginn im Archiv.</span></div>
        <select aria-label="Aktiver Bezirksvorstand" value={about.activeBoardId} onChange={(event) => selectActiveBoard(event.target.value)} required>
          <option value="">Vorstand auswählen</option>
          {about.boards.map((board, index) => <option value={board.id} key={`${board.id}-${index}`}>{board.term || `Vorstand ${index + 1}`}</option>)}
        </select>
      </div>
      {about.boards.map((board, index) => <details key={index} className="about-editor-record">
        <summary><span><strong>{board.term || `Vorstand ${index + 1}`}</strong><small>Beginn: {board.startDate || "noch offen"}</small></span>{about.activeBoardId === board.id && board.id ? <mark>Aktiver Vorstand</mark> : null}</summary>
        <fieldset aria-label={`Vorstand ${index + 1}`}><legend>Vorstand {index + 1}</legend>
          <button className="editorial-button editorial-button-danger about-editor-remove" type="button" onClick={() => removeCollectionItem("boards", index)}>Vorstand entfernen</button>
          <div className="editorial-form-grid">
            <div><label><FieldLabel hint="Pflicht · Kleinbuchstaben, Zahlen, Bindestriche · max. 100">Datensatz-ID</FieldLabel></label><input aria-label={`Datensatz-ID Vorstand ${index + 1}`} value={board.id} maxLength={100} pattern="[a-z0-9-]+" onChange={(event) => updateBoardId(index, event.target.value)} required /></div>
            <div><label><FieldLabel hint="Pflichtfeld · 4–40 Zeichen">Amtszeit</FieldLabel></label><input aria-label={`Amtszeit Vorstand ${index + 1}`} value={board.term} minLength={4} maxLength={40} onChange={(event) => updateCollection("boards", index, { ...board, term: event.target.value })} required /></div>
            <div><label><FieldLabel hint="Pflichtfeld">Beginn</FieldLabel></label><input aria-label={`Beginn Vorstand ${index + 1}`} type="date" value={board.startDate} onChange={(event) => updateCollection("boards", index, { ...board, startDate: event.target.value })} required /></div>

          </div>
          <label><FieldLabel hint="Optional · maximal 12.000 Zeichen">Text des Bezirksvorstands</FieldLabel></label><textarea aria-label={`Text Vorstand ${index + 1}`} rows={6} maxLength={12000} value={board.message} onChange={(event) => updateCollection("boards", index, { ...board, message: event.target.value })} />
          <label><FieldLabel hint="Optional · JPG, PNG oder WebP · direkt diesem Vorstand zugeordnet">Vorstandsfoto</FieldLabel></label><input aria-label={`Foto Vorstand ${index + 1}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => { try { const photoId = await upload(event.target.files?.[0], board.photoId); updateCollection("boards", index, { ...board, photoId }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Foto konnte nicht hochgeladen werden."); } }} />
          {board.photoId ? <small>Gespeichertes Foto: {board.photoId}</small> : null}
          <label><FieldLabel hint="Pflicht, sobald ein öffentliches Foto vorhanden ist · max. 240 Zeichen">Alternativtext</FieldLabel></label><input aria-label={`Alternativtext Vorstand ${index + 1}`} maxLength={240} value={board.photoAlt} onChange={(event) => updateCollection("boards", index, { ...board, photoAlt: event.target.value })} />
        </fieldset>
      </details>)}
    </section>

    <section>
      <div className="editorial-form-heading"><h2>Satzungen</h2><button className="editorial-button editorial-button-secondary" type="button" onClick={addStatute}>Satzung hinzufügen</button></div>
      <p className="editorial-form-note">Hier werden nur Satzungen verwaltet. Andere PDF-Anhänge gehören direkt zu ihrem BDK-Eintrag.</p>
      {about.documents.map((document, index) => document.kind === "satzung" ? <details key={index} className="about-editor-record">
        <summary><span><strong>{document.title || `Satzung ${index + 1}`}</strong><small>Satzung Nr. {document.number || "–"}</small></span></summary>
        <fieldset aria-label={`Dokument ${index + 1}`}><legend>Satzung {index + 1}</legend>
          <button className="editorial-button editorial-button-danger about-editor-remove" type="button" onClick={() => removeCollectionItem("documents", index)}>Dokument entfernen</button>
          <div className="editorial-form-grid">
            <div><label><FieldLabel hint="Pflichtfeld · 3–180 Zeichen">Titel</FieldLabel></label><input aria-label={`Titel Dokument ${index + 1}`} minLength={3} maxLength={180} value={document.title} onChange={(event) => updateCollection("documents", index, { ...document, title: event.target.value, fileName: `${event.target.value}.pdf` })} required /></div>
            <div><label><FieldLabel hint="Pflichtfeld · maximal 40 Zeichen">Nummer</FieldLabel></label><input aria-label={`Nummer Satzung ${index + 1}`} maxLength={40} value={document.number} onChange={(event) => updateCollection("documents", index, { ...document, number: event.target.value })} required /></div>
            <div><label><FieldLabel hint="Pflichtfeld · das Ende wird aus der nächsten Satzung berechnet">Gültig ab</FieldLabel></label><input aria-label={`Gültig ab Satzung ${index + 1}`} type="date" value={document.effectiveFrom} onChange={(event) => updateCollection("documents", index, { ...document, date: event.target.value, effectiveFrom: event.target.value })} required /></div>
          </div>
          <label><FieldLabel hint="Genau eine PDF ist erforderlich · wird direkt dieser Satzung zugeordnet">PDF ersetzen oder hochladen</FieldLabel></label><input aria-label={`PDF Dokument ${index + 1}`} type="file" accept="application/pdf" onChange={async (event) => { try { const mediaId = await upload(event.target.files?.[0], document.mediaId); updateCollection("documents", index, { ...document, mediaId, bundledFile: mediaId ? "" : document.bundledFile }); } catch (reason) { setError(reason instanceof Error ? reason.message : "PDF konnte nicht hochgeladen werden."); } }} />
          <small>{document.bundledFile ? `Gebündelte Datei: ${document.bundledFile}` : document.mediaId ? `Upload: ${document.mediaId}` : "Noch keine Datei"}</small>
        </fieldset>
      </details> : null)}
    </section>

    <section>
      <div className="editorial-form-heading"><h2>BDKs</h2><button className="editorial-button editorial-button-secondary" type="button" onClick={() => setAbout({ ...about, bdks: [...about.bdks, { ...emptyBdk }] })}>BDK hinzufügen</button></div>
      <p className="editorial-form-note">Jeder BDK-Eintrag enthält direkt seine eigenen PDF-Anhänge und Links.</p>
      {about.bdks.map((bdk, index) => <details key={index} className="about-editor-record">
        <summary><span><strong>{bdk.title || `BDK ${index + 1}`}</strong><small>{bdk.founding ? "Fest hinterlegt · nur Dokumente bearbeitbar" : bdk.date || "Datum noch offen"}</small></span>{bdk.founding ? <mark>Gründungs-BDK</mark> : null}</summary>
        <fieldset aria-label={`BDK ${index + 1}`}><legend>BDK {index + 1}</legend>
          {bdk.founding ? <p className="editorial-form-note">Die Gründungs-BDK und ihre Fotos sind fest hinterlegt. Hier können nur die zugehörigen Dokumente geändert werden.</p> : <>
          <button className="editorial-button editorial-button-danger about-editor-remove" type="button" onClick={() => removeCollectionItem("bdks", index)}>BDK entfernen</button>
          <div className="editorial-form-grid">
            <div><label><FieldLabel hint="Pflicht · Kleinbuchstaben, Zahlen, Bindestriche · max. 100">ID</FieldLabel></label><input aria-label={`ID BDK ${index + 1}`} maxLength={100} value={bdk.id} pattern="[a-z0-9-]+" onChange={(event) => updateCollection("bdks", index, { ...bdk, id: event.target.value })} required /></div>
            <div><label><FieldLabel hint="Pflichtfeld · 3–180 Zeichen">Titel</FieldLabel></label><input aria-label={`Titel BDK ${index + 1}`} minLength={3} maxLength={180} value={bdk.title} onChange={(event) => updateCollection("bdks", index, { ...bdk, title: event.target.value })} required /></div>
            <div><label><FieldLabel hint="Optional · maximal 300 Zeichen">Untertitel</FieldLabel></label><input aria-label={`Untertitel BDK ${index + 1}`} maxLength={300} value={bdk.subtitle} onChange={(event) => updateCollection("bdks", index, { ...bdk, subtitle: event.target.value })} /></div>
            <div><label><FieldLabel hint="Pflichtfeld">Datum</FieldLabel></label><input aria-label={`Datum BDK ${index + 1}`} type="date" value={bdk.date} onChange={(event) => updateCollection("bdks", index, { ...bdk, date: event.target.value })} required /></div>
            <div><label><FieldLabel hint="Optional">Uhrzeit</FieldLabel></label><input aria-label={`Uhrzeit BDK ${index + 1}`} type="time" value={bdk.time} onChange={(event) => updateCollection("bdks", index, { ...bdk, time: event.target.value })} /></div>
            <div><label><FieldLabel hint="Optional · 2–180 Zeichen, wenn angegeben">Ort</FieldLabel></label><input aria-label={`Ort BDK ${index + 1}`} minLength={2} maxLength={180} value={bdk.location} onChange={(event) => updateCollection("bdks", index, { ...bdk, location: event.target.value })} /></div>

          </div>
          <label><FieldLabel hint="Pflichtfeld · 10–3.000 Zeichen">Zusammenfassung</FieldLabel></label><textarea aria-label={`Zusammenfassung BDK ${index + 1}`} rows={5} minLength={10} maxLength={3000} value={bdk.summary} onChange={(event) => updateCollection("bdks", index, { ...bdk, summary: event.target.value })} required />
          </>}
          <fieldset className="about-editor-options about-editor-options-compact"><legend>PDF-Anhänge</legend>
            {bdk.documentIds.filter((id) => about.documents.find((document) => document.id === id)?.kind !== "satzung").map((id, documentIndex) => { const document = about.documents.find((item) => item.id === id); return document ? <div className="about-inline-resource about-inline-resource-compact" key={id}>
              <div><label><FieldLabel hint="Pflicht · 3–180 Zeichen">Titel</FieldLabel></label><input aria-label={`Titel Anhang ${documentIndex + 1} BDK ${index + 1}`} minLength={3} maxLength={180} value={document.title} onChange={(event) => updateDocument(id, { ...document, title: event.target.value, fileName: `${event.target.value}.pdf` })} required /></div>
              <label><FieldLabel hint="PDF · ersetzt nur die Datei dieses Anhangs">PDF ersetzen</FieldLabel></label><input aria-label={`PDF Anhang ${documentIndex + 1} BDK ${index + 1}`} type="file" accept="application/pdf" onChange={async (event) => { try { const mediaId = await upload(event.target.files?.[0], document.mediaId); updateDocument(id, { ...document, mediaId, bundledFile: mediaId ? "" : document.bundledFile }); } catch (reason) { setError(reason instanceof Error ? reason.message : "PDF konnte nicht hochgeladen werden."); } }} />
              <button className="editorial-button editorial-button-danger" type="button" onClick={() => detachBdkDocument(index, id)}>Anhang löschen</button>
            </div> : null; })}
            <label><FieldLabel hint="PDF · wird sofort direkt diesem Eintrag zugeordnet">Neuen Anhang hochladen</FieldLabel></label><input aria-label={`Neuen Anhang BDK ${index + 1}`} type="file" accept="application/pdf" onChange={async (event) => { try { await addBdkDocument(index, event.target.files?.[0]); event.target.value = ""; } catch (reason) { setError(reason instanceof Error ? reason.message : "PDF konnte nicht hochgeladen werden."); } }} />
          </fieldset>
          {!bdk.founding ? <fieldset className="about-editor-links"><legend>Externe Links</legend>{bdk.links.map((link, linkIndex) => <div className="editorial-form-grid" key={`${link.url}-${linkIndex}`}><div><label><FieldLabel hint="Pflichtfeld · 2–120 Zeichen">Linktitel</FieldLabel></label><input aria-label={`Linktitel BDK ${index + 1} Link ${linkIndex + 1}`} minLength={2} maxLength={120} value={link.label} onChange={(event) => updateCollection("bdks", index, { ...bdk, links: bdk.links.map((item, itemIndex) => itemIndex === linkIndex ? { ...item, label: event.target.value } : item) })} required /></div><div><label><FieldLabel hint="Pflichtfeld · muss mit https:// beginnen">HTTPS-Adresse</FieldLabel></label><input aria-label={`Adresse BDK ${index + 1} Link ${linkIndex + 1}`} type="url" value={link.url} pattern="https://.*" onChange={(event) => updateCollection("bdks", index, { ...bdk, links: bdk.links.map((item, itemIndex) => itemIndex === linkIndex ? { ...item, url: event.target.value } : item) })} required /></div><button className="editorial-button editorial-button-danger" type="button" onClick={() => updateCollection("bdks", index, { ...bdk, links: bdk.links.filter((_, itemIndex) => itemIndex !== linkIndex) })}>Link entfernen</button></div>)}<button className="editorial-button editorial-button-secondary" type="button" onClick={() => updateCollection("bdks", index, { ...bdk, links: [...bdk.links, { label: "", url: "https://" }] })}>Link hinzufügen</button></fieldset> : null}
        </fieldset>
      </details>)}
    </section>

    {message ? <p className="editorial-success" role="status">{message}</p> : null}{error ? <p className="editorial-error" role="alert">{error}</p> : null}
    <button className="editorial-button" type="submit" disabled={saving}>{saving ? "Wird gespeichert …" : "Alle Über-uns-Inhalte speichern"}</button>
  </form>;
}
