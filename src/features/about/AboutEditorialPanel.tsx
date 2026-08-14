"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import type { AboutContent } from "@/lib/about-schema";

const emptyBoard: AboutContent["boards"][number] = { id: "", term: "", startDate: "", endDate: "", message: "", photoId: "", photoAlt: "", status: "draft" };
const emptyBdk: AboutContent["bdks"][number] = { id: "", title: "", subtitle: "", date: "", time: "", location: "", summary: "", documentIds: [], photoIds: [], links: [], status: "draft", founding: false };
const emptyDocument: AboutContent["documents"][number] = { id: "", title: "", kind: "sonstiges", date: "", number: "", effectiveFrom: "", effectiveUntil: "", status: "draft", mediaId: "", bundledFile: "", fileName: "" };
const emptyMedia: AboutContent["media"][number] = { id: "", alt: "", caption: "", status: "draft", mediaId: "", bundledFile: "" };

type Collection = "boards" | "bdks" | "documents" | "media";

function statusLabel(status: "draft" | "published") {
  return status === "published" ? "Veröffentlicht" : "Entwurf";
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
    if (collection === "bdks") setAbout({ ...about, bdks: about.bdks.filter((_, itemIndex) => itemIndex !== index) });
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
      <label htmlFor="about-intro">Was wir sind</label>
      <textarea id="about-intro" rows={5} minLength={20} maxLength={12000} value={about.intro} onChange={(event) => setAbout({ ...about, intro: event.target.value })} required />
      <label htmlFor="about-values">Wofür wir stehen</label>
      <textarea id="about-values" rows={5} minLength={20} maxLength={12000} value={about.values} onChange={(event) => setAbout({ ...about, values: event.target.value })} required />
    </section>

    <section>
      <div className="editorial-form-heading"><h2>Bezirksvorstände</h2><button className="editorial-button editorial-button-secondary" type="button" onClick={() => setAbout({ ...about, boards: [...about.boards, { ...emptyBoard }] })}>Vorstand hinzufügen</button></div>
      <div className="about-active-board">
        <div><strong>Aktiver Bezirksvorstand</strong><span>Dieser Vorstand erscheint ganz oben auf der öffentlichen Seite.</span></div>
        <select aria-label="Aktiver Bezirksvorstand" value={about.activeBoardId} onChange={(event) => selectActiveBoard(event.target.value)} required>
          <option value="">Vorstand auswählen</option>
          {about.boards.map((board, index) => <option value={board.id} key={`${board.id}-${index}`}>{board.term || `Vorstand ${index + 1}`} · {statusLabel(board.status)}</option>)}
        </select>
      </div>
      {about.boards.map((board, index) => <details key={index} className="about-editor-record">
        <summary><span><strong>{board.term || `Vorstand ${index + 1}`}</strong><small>{statusLabel(board.status)}</small></span>{about.activeBoardId === board.id && board.id ? <mark>Aktiver Vorstand</mark> : null}</summary>
        <fieldset aria-label={`Vorstand ${index + 1}`}><legend>Vorstand {index + 1}</legend>
          <button className="editorial-button editorial-button-danger about-editor-remove" type="button" onClick={() => removeCollectionItem("boards", index)}>Vorstand entfernen</button>
          <div className="editorial-form-grid">
            <div><label>Datensatz-ID</label><input aria-label={`Datensatz-ID Vorstand ${index + 1}`} value={board.id} pattern="[a-z0-9-]+" onChange={(event) => updateBoardId(index, event.target.value)} required /></div>
            <div><label>Amtszeit</label><input aria-label={`Amtszeit Vorstand ${index + 1}`} value={board.term} onChange={(event) => updateCollection("boards", index, { ...board, term: event.target.value })} required /></div>
            <div><label>Beginn</label><input aria-label={`Beginn Vorstand ${index + 1}`} type="date" value={board.startDate} onChange={(event) => updateCollection("boards", index, { ...board, startDate: event.target.value })} required /></div>
            <div><label>Ende (optional)</label><input aria-label={`Ende Vorstand ${index + 1}`} type="date" value={board.endDate} onChange={(event) => updateCollection("boards", index, { ...board, endDate: event.target.value })} /></div>
            <div><label>Status</label><select aria-label={`Status Vorstand ${index + 1}`} value={board.status} onChange={(event) => updateCollection("boards", index, { ...board, status: event.target.value as typeof board.status })}><option value="draft">Entwurf</option><option value="published">Veröffentlicht</option></select></div>
          </div>
          <label>Text des Bezirksvorstands</label><textarea aria-label={`Text Vorstand ${index + 1}`} rows={6} value={board.message} onChange={(event) => updateCollection("boards", index, { ...board, message: event.target.value })} />
          <label>Vorstandsfoto</label><input aria-label={`Foto Vorstand ${index + 1}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => { try { const photoId = await upload(event.target.files?.[0], board.photoId); updateCollection("boards", index, { ...board, photoId }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Foto konnte nicht hochgeladen werden."); } }} />
          {board.photoId ? <small>Gespeichertes Foto: {board.photoId}</small> : null}
          <label>Alternativtext</label><input aria-label={`Alternativtext Vorstand ${index + 1}`} value={board.photoAlt} onChange={(event) => updateCollection("boards", index, { ...board, photoAlt: event.target.value })} />
        </fieldset>
      </details>)}
    </section>

    <section>
      <div className="editorial-form-heading"><h2>Dokumente und Satzungen</h2><button className="editorial-button editorial-button-secondary" type="button" onClick={() => setAbout({ ...about, documents: [...about.documents, { ...emptyDocument }] })}>Dokument hinzufügen</button></div>
      {about.documents.map((document, index) => <details key={index} className="about-editor-record">
        <summary><span><strong>{document.title || `Dokument ${index + 1}`}</strong><small>{document.kind === "satzung" ? `Satzung Nr. ${document.number || "–"}` : document.kind} · {statusLabel(document.status)}</small></span></summary>
        <fieldset aria-label={`Dokument ${index + 1}`}><legend>Dokument {index + 1}</legend>
          <button className="editorial-button editorial-button-danger about-editor-remove" type="button" onClick={() => removeCollectionItem("documents", index)}>Dokument entfernen</button>
          <div className="editorial-form-grid">
            <div><label>ID</label><input aria-label={`ID Dokument ${index + 1}`} value={document.id} pattern="[a-z0-9-]+" onChange={(event) => updateCollection("documents", index, { ...document, id: event.target.value })} required /></div>
            <div><label>Titel</label><input aria-label={`Titel Dokument ${index + 1}`} value={document.title} onChange={(event) => updateCollection("documents", index, { ...document, title: event.target.value })} required /></div>
            <div><label>Art</label><select aria-label={`Art Dokument ${index + 1}`} value={document.kind} onChange={(event) => updateCollection("documents", index, { ...document, kind: event.target.value as typeof document.kind })}><option value="satzung">Satzung</option><option value="einladung">Einladung</option><option value="tagesordnung">Tagesordnung</option><option value="protokoll">Protokoll</option><option value="sonstiges">Sonstiges</option></select></div>
            <div><label>Dokumentdatum</label><input aria-label={`Datum Dokument ${index + 1}`} type="date" value={document.date} onChange={(event) => updateCollection("documents", index, { ...document, date: event.target.value })} required /></div>
            {document.kind === "satzung" ? <><div><label>Nummer</label><input aria-label={`Nummer Satzung ${index + 1}`} value={document.number} onChange={(event) => updateCollection("documents", index, { ...document, number: event.target.value })} /></div><div><label>Gültig ab</label><input aria-label={`Gültig ab Satzung ${index + 1}`} type="date" value={document.effectiveFrom} onChange={(event) => updateCollection("documents", index, { ...document, effectiveFrom: event.target.value })} required /></div><div><label>Gültig bis (optional)</label><input aria-label={`Gültig bis Satzung ${index + 1}`} type="date" value={document.effectiveUntil} onChange={(event) => updateCollection("documents", index, { ...document, effectiveUntil: event.target.value })} /></div></> : null}
            <div><label>Status</label><select aria-label={`Status Dokument ${index + 1}`} value={document.status} onChange={(event) => updateCollection("documents", index, { ...document, status: event.target.value as typeof document.status })}><option value="draft">Entwurf</option><option value="published">Veröffentlicht</option></select></div>
            <div><label>Dateiname</label><input aria-label={`Dateiname Dokument ${index + 1}`} value={document.fileName} onChange={(event) => updateCollection("documents", index, { ...document, fileName: event.target.value })} required /></div>
          </div>
          <label>PDF ersetzen/hochladen</label><input aria-label={`PDF Dokument ${index + 1}`} type="file" accept="application/pdf" onChange={async (event) => { try { const mediaId = await upload(event.target.files?.[0], document.mediaId); updateCollection("documents", index, { ...document, mediaId, bundledFile: mediaId ? "" : document.bundledFile }); } catch (reason) { setError(reason instanceof Error ? reason.message : "PDF konnte nicht hochgeladen werden."); } }} />
          <small>{document.bundledFile ? `Gebündelte Datei: ${document.bundledFile}` : document.mediaId ? `Upload: ${document.mediaId}` : "Noch keine Datei"}</small>
        </fieldset>
      </details>)}
    </section>

    <section>
      <div className="editorial-form-heading"><h2>Bildergalerie</h2><button className="editorial-button editorial-button-secondary" type="button" onClick={() => setAbout({ ...about, media: [...about.media, { ...emptyMedia }] })}>Bild hinzufügen</button></div>
      <p className="editorial-form-note">Diese Bilder können den BDK-Einträgen und der Gründung zugeordnet werden.</p>
      {about.media.map((media, index) => <details key={index} className="about-editor-record">
        <summary><span><strong>{media.caption || media.id || `Bild ${index + 1}`}</strong><small>{statusLabel(media.status)}</small></span></summary>
        <fieldset aria-label={`Bild ${index + 1}`}><legend>Bild {index + 1}</legend>
          <button className="editorial-button editorial-button-danger about-editor-remove" type="button" onClick={() => removeCollectionItem("media", index)}>Bild entfernen</button>
          <div className="editorial-form-grid">
            <div><label>ID</label><input aria-label={`ID Bild ${index + 1}`} value={media.id} pattern="[a-z0-9-]+" onChange={(event) => updateCollection("media", index, { ...media, id: event.target.value })} required /></div>
            <div><label>Status</label><select aria-label={`Status Bild ${index + 1}`} value={media.status} onChange={(event) => updateCollection("media", index, { ...media, status: event.target.value as typeof media.status })}><option value="draft">Entwurf</option><option value="published">Veröffentlicht</option></select></div>
          </div>
          <label>Alternativtext</label><input aria-label={`Alternativtext Bild ${index + 1}`} value={media.alt} onChange={(event) => updateCollection("media", index, { ...media, alt: event.target.value })} required />
          <label>Bildunterschrift (optional)</label><input aria-label={`Bildunterschrift Bild ${index + 1}`} value={media.caption} onChange={(event) => updateCollection("media", index, { ...media, caption: event.target.value })} />
          <label>Bild ersetzen/hochladen</label><input aria-label={`Datei Bild ${index + 1}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => { try { const mediaId = await upload(event.target.files?.[0], media.mediaId); updateCollection("media", index, { ...media, mediaId, bundledFile: mediaId ? "" : media.bundledFile }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Bild konnte nicht hochgeladen werden."); } }} />
          <small>{media.bundledFile ? `Gebündeltes Bild: ${media.bundledFile}` : media.mediaId ? `Upload: ${media.mediaId}` : "Noch keine Bilddatei"}</small>
        </fieldset>
      </details>)}
    </section>

    <section>
      <div className="editorial-form-heading"><h2>BDKs und Archiveinträge</h2><button className="editorial-button editorial-button-secondary" type="button" onClick={() => setAbout({ ...about, bdks: [...about.bdks, { ...emptyBdk }] })}>BDK hinzufügen</button></div>
      {about.bdks.map((bdk, index) => <details key={index} className="about-editor-record">
        <summary><span><strong>{bdk.title || `BDK ${index + 1}`}</strong><small>{bdk.founding ? "Gründung · " : ""}{statusLabel(bdk.status)}</small></span>{bdk.founding ? <mark>Gründungsbereich</mark> : null}</summary>
        <fieldset aria-label={`BDK ${index + 1}`}><legend>BDK {index + 1}</legend>
          <button className="editorial-button editorial-button-danger about-editor-remove" type="button" onClick={() => removeCollectionItem("bdks", index)}>BDK entfernen</button>
          <div className="editorial-form-grid">
            <div><label>ID</label><input aria-label={`ID BDK ${index + 1}`} value={bdk.id} pattern="[a-z0-9-]+" onChange={(event) => updateCollection("bdks", index, { ...bdk, id: event.target.value })} required /></div>
            <div><label>Titel</label><input aria-label={`Titel BDK ${index + 1}`} value={bdk.title} onChange={(event) => updateCollection("bdks", index, { ...bdk, title: event.target.value })} required /></div>
            <div><label>Untertitel (optional)</label><input aria-label={`Untertitel BDK ${index + 1}`} value={bdk.subtitle} onChange={(event) => updateCollection("bdks", index, { ...bdk, subtitle: event.target.value })} /></div>
            <div><label>Datum</label><input aria-label={`Datum BDK ${index + 1}`} type="date" value={bdk.date} onChange={(event) => updateCollection("bdks", index, { ...bdk, date: event.target.value })} required /></div>
            <div><label>Uhrzeit (optional)</label><input aria-label={`Uhrzeit BDK ${index + 1}`} type="time" value={bdk.time} onChange={(event) => updateCollection("bdks", index, { ...bdk, time: event.target.value })} /></div>
            <div><label>Ort</label><input aria-label={`Ort BDK ${index + 1}`} value={bdk.location} onChange={(event) => updateCollection("bdks", index, { ...bdk, location: event.target.value })} required /></div>
            <div><label>Status</label><select aria-label={`Status BDK ${index + 1}`} value={bdk.status} onChange={(event) => updateCollection("bdks", index, { ...bdk, status: event.target.value as typeof bdk.status })}><option value="draft">Entwurf</option><option value="published">Veröffentlicht</option></select></div>
            <div><label><input aria-label={`Gründungs-BDK ${index + 1}`} type="checkbox" checked={bdk.founding} onChange={(event) => updateCollection("bdks", index, { ...bdk, founding: event.target.checked })} /> Gründungs-BDK</label></div>
          </div>
          <label>Zusammenfassung</label><textarea aria-label={`Zusammenfassung BDK ${index + 1}`} rows={5} value={bdk.summary} onChange={(event) => updateCollection("bdks", index, { ...bdk, summary: event.target.value })} required />
          <fieldset className="about-editor-options"><legend>Anhänge</legend>{about.documents.map((document) => <label key={document.id}><input type="checkbox" checked={bdk.documentIds.includes(document.id)} onChange={(event) => updateCollection("bdks", index, { ...bdk, documentIds: event.target.checked ? [...bdk.documentIds, document.id] : bdk.documentIds.filter((id) => id !== document.id) })} /> {document.title}</label>)}</fieldset>
          <fieldset className="about-editor-options"><legend>Bilder</legend>{about.media.map((media) => <label key={media.id}><input type="checkbox" checked={bdk.photoIds.includes(media.id)} onChange={(event) => updateCollection("bdks", index, { ...bdk, photoIds: event.target.checked ? [...bdk.photoIds, media.id] : bdk.photoIds.filter((id) => id !== media.id) })} /> {media.caption || media.id}</label>)}</fieldset>
          <fieldset className="about-editor-links"><legend>Externe Links</legend>{bdk.links.map((link, linkIndex) => <div className="editorial-form-grid" key={`${link.url}-${linkIndex}`}><div><label>Linktitel</label><input aria-label={`Linktitel BDK ${index + 1} Link ${linkIndex + 1}`} value={link.label} onChange={(event) => updateCollection("bdks", index, { ...bdk, links: bdk.links.map((item, itemIndex) => itemIndex === linkIndex ? { ...item, label: event.target.value } : item) })} required /></div><div><label>HTTPS-Adresse</label><input aria-label={`Adresse BDK ${index + 1} Link ${linkIndex + 1}`} type="url" value={link.url} onChange={(event) => updateCollection("bdks", index, { ...bdk, links: bdk.links.map((item, itemIndex) => itemIndex === linkIndex ? { ...item, url: event.target.value } : item) })} required /></div><button className="editorial-button editorial-button-danger" type="button" onClick={() => updateCollection("bdks", index, { ...bdk, links: bdk.links.filter((_, itemIndex) => itemIndex !== linkIndex) })}>Link entfernen</button></div>)}<button className="editorial-button editorial-button-secondary" type="button" onClick={() => updateCollection("bdks", index, { ...bdk, links: [...bdk.links, { label: "", url: "https://" }] })}>Link hinzufügen</button></fieldset>
        </fieldset>
      </details>)}
    </section>

    {message ? <p className="editorial-success" role="status">{message}</p> : null}{error ? <p className="editorial-error" role="alert">{error}</p> : null}
    <button className="editorial-button" type="submit" disabled={saving}>{saving ? "Wird gespeichert …" : "Alle Über-uns-Inhalte speichern"}</button>
  </form>;
}
