"use client";

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { currentGermanDate, isActivePoster, roundPosterPlacement } from "@/features/notice-board/poster-placement";
import type { ModeratedPoster, NoticeBoardContent, PosterPlacement } from "@/features/notice-board/domain/moderation";

const defaultPlacement: PosterPlacement = { boardId: "left", left: 38, top: 28, width: 24, height: 38, rotation: 0 };
const statusLabels = { pending: "Ausstehend", approved: "Freigegeben", rejected: "Abgelehnt" } as const;
type DragMode = "move" | "resize";

type PosterValues = {
  status: ModeratedPoster["status"];
  expiresAt: string;
  placement: PosterPlacement;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function PosterModerationPanel() {
  const [posters, setPosters] = useState<ModeratedPoster[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [values, setValues] = useState<PosterValues>();
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const drag = useRef<{ mode: DragMode; pointerId: number; startX: number; startY: number; start: PosterPlacement; width: number; height: number } | undefined>(undefined);

  async function load() {
    const response = await fetch("/api/redaktion/notice-board", { cache: "no-store" });
    if (response.status === 401) return window.location.reload();
    const result = await response.json() as NoticeBoardContent;
    setPosters(result.posters ?? []);
    setBusy(false);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/redaktion/notice-board", { cache: "no-store" }).then(async (response) => {
      if (response.status === 401) return window.location.reload();
      const result = await response.json() as NoticeBoardContent;
      if (!active) return;
      setPosters(result.posters ?? []);
      setBusy(false);
    });
    return () => { active = false; };
  }, []);

  function select(poster: ModeratedPoster) {
    setSelectedId(poster.id);
    setValues({ status: poster.status, expiresAt: poster.expiresAt, placement: roundPosterPlacement(poster.placement ?? defaultPlacement) });
    setMessage("");
    setError("");
  }

  function updatePlacement<K extends keyof PosterPlacement>(field: K, value: PosterPlacement[K]) {
    setValues((current) => current ? { ...current, placement: { ...current.placement, [field]: value } } : current);
  }

  function startDrag(event: ReactPointerEvent<HTMLElement>, mode: DragMode) {
    if (!values) return;
    const board = event.currentTarget.closest<HTMLElement>(".editorial-board-canvas");
    if (!board) return;
    const rectangle = board.getBoundingClientRect();
    drag.current = {
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      start: values.placement,
      width: rectangle.width,
      height: rectangle.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = ((event.clientX - active.startX) / active.width) * 100;
    const dy = ((event.clientY - active.startY) / active.height) * 100;
    if (active.mode === "move") {
      const left = clamp(active.start.left + dx, 0, 100 - active.start.width);
      const top = clamp(active.start.top + dy, 0, 100 - active.start.height);
      setValues((current) => current ? { ...current, placement: roundPosterPlacement({ ...current.placement, left, top }) } : current);
    } else {
      const width = clamp(active.start.width + dx, 8, Math.min(60, 100 - active.start.left));
      const height = clamp(active.start.height + dy, 8, Math.min(80, 100 - active.start.top));
      setValues((current) => current ? { ...current, placement: roundPosterPlacement({ ...current.placement, width, height }) } : current);
    }
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = undefined;
  }

  async function persist(bringToFront = false) {
    if (!selectedId || !values) return;
    setSaving(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/redaktion/notice-board/posters/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, placement: roundPosterPlacement(values.placement), bringToFront }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(typeof result.error === "string" ? result.error : "Poster konnte nicht gespeichert werden.");
    else {
      setMessage(values.status === "approved" ? "Poster platziert und freigegeben." : "Poster gespeichert.");
      await load();
    }
    setSaving(false);
  }

  if (busy) return <p>Poster werden geladen …</p>;
  const selected = posters.find((poster) => poster.id === selectedId);
  const activePosters = posters.filter((poster) => isActivePoster(poster, currentGermanDate()));
  const reviewPosters = posters.filter((poster) => poster.status !== "rejected");
  const rejectedPosters = posters.filter((poster) => poster.status === "rejected");

  return (
    <div className="poster-moderation-layout">
      <aside className="editorial-article-list" aria-label="Poster-Einreichungen">
        <h2>Poster-Einreichungen</h2>
        {reviewPosters.length === 0 ? <p className="editorial-muted">Noch keine offenen oder freigegebenen Einreichungen.</p> : (
          <ul>{reviewPosters.map((poster) => (
            <li key={poster.id}>
              <button className={poster.id === selectedId ? "editorial-article-link editorial-article-link-active" : "editorial-article-link"} type="button" onClick={() => select(poster)}>
                <strong>{poster.title}</strong>
                <span>{statusLabels[poster.status]}{poster.expiresAt ? ` · bis ${poster.expiresAt}` : ""}</span>
              </button>
            </li>
          ))}</ul>
        )}
      </aside>
      <div className="poster-moderation-workspace">
        <div className="editorial-board-display" aria-label="Poster auf den Bulletin Boards platzieren">
            {(["left", "right"] as const).map((boardId) => (
              <div className="editorial-board-canvas" key={boardId}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="editorial-board-image" src="/bulletin-board-transparent.png" alt={`Bulletin Board ${boardId === "left" ? "links" : "rechts"}`} />
                {activePosters.filter((poster) => poster.id !== selectedId && poster.placement?.boardId === boardId).sort((a, b) => a.layer - b.layer).map((poster) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={poster.id} className="editorial-placed-poster editorial-placed-poster-existing" src={`/api/redaktion/notice-board/media/${poster.mediaId}`} alt="" style={{ left: `${poster.placement!.left}%`, top: `${poster.placement!.top}%`, width: `${poster.placement!.width}%`, height: `${poster.placement!.height}%`, transform: `rotate(${poster.placement!.rotation}deg)`, zIndex: poster.layer }} />
                ))}
                {values && selected && values.placement.boardId === boardId ? (
                  <div className="editorial-placed-poster editorial-placed-poster-selected" style={{ left: `${values.placement.left}%`, top: `${values.placement.top}%`, width: `${values.placement.width}%`, height: `${values.placement.height}%`, transform: `rotate(${values.placement.rotation}deg)` }} onPointerDown={(event) => startDrag(event, "move")} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/redaktion/notice-board/media/${selected.mediaId}`} alt={selected.title} draggable={false} />
                    <span className="poster-resize-handle" aria-hidden="true" onPointerDown={(event) => { event.stopPropagation(); startDrag(event, "resize"); }} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} />
                  </div>
                ) : null}
              </div>
            ))}
        </div>
        {values && selected ? (
          <form aria-label="Poster moderieren" className="editorial-form poster-placement-form" onSubmit={(event) => { event.preventDefault(); void persist(); }}>
            <div className="editorial-form-heading"><h2>Platzierung und Freigabe</h2><p className="editorial-muted">Ziehe das Poster auf dem Brett. Am goldenen Griff kannst du es vergrößern oder verkleinern.</p></div>
            <p className="editorial-contact">Kontakt: <a href={`mailto:${selected.contactEmail}`}>{selected.contactEmail}</a>{selected.contactName ? ` · ${selected.contactName}` : ""}</p>
            <div className="editorial-form-grid">
              <div><label htmlFor="poster-board">Brett</label><select id="poster-board" value={values.placement.boardId} onChange={(event) => updatePlacement("boardId", event.target.value as PosterPlacement["boardId"])}><option value="left">Links</option><option value="right">Rechts</option></select></div>
              <div><label htmlFor="poster-expiry">Ablaufdatum</label><input id="poster-expiry" type="date" value={values.expiresAt} onChange={(event) => setValues({ ...values, expiresAt: event.target.value })} required={values.status === "approved"} /></div>
              <div><label htmlFor="poster-left">Position links (%)</label><input id="poster-left" type="number" min="0" max={100 - values.placement.width} step="0.1" value={values.placement.left} onChange={(event) => updatePlacement("left", Number(event.target.value))} /></div>
              <div><label htmlFor="poster-top">Position oben (%)</label><input id="poster-top" type="number" min="0" max={100 - values.placement.height} step="0.1" value={values.placement.top} onChange={(event) => updatePlacement("top", Number(event.target.value))} /></div>
              <div><label htmlFor="poster-width">Breite (%)</label><input id="poster-width" type="number" min="8" max={Math.min(60, 100 - values.placement.left)} step="0.1" value={values.placement.width} onChange={(event) => updatePlacement("width", Number(event.target.value))} /></div>
              <div><label htmlFor="poster-height">Höhe (%)</label><input id="poster-height" type="number" min="8" max={Math.min(80, 100 - values.placement.top)} step="0.1" value={values.placement.height} onChange={(event) => updatePlacement("height", Number(event.target.value))} /></div>
              <div><label htmlFor="poster-rotation">Drehung (°)</label><input id="poster-rotation" type="number" min="-15" max="15" step="1" value={values.placement.rotation} onChange={(event) => updatePlacement("rotation", Number(event.target.value))} /></div>
              <div><label htmlFor="poster-status">Status</label><select id="poster-status" value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value as PosterValues["status"] })}><option value="pending">Ausstehend</option><option value="approved">Freigegeben</option><option value="rejected">Abgelehnt</option></select></div>
            </div>
            {message ? <p className="editorial-success" role="status">{message}</p> : null}
            {error ? <p className="editorial-error" role="alert">{error}</p> : null}
            <div className="editorial-actions"><button className="editorial-button" type="submit" disabled={saving}>{saving ? "Wird gespeichert …" : "Speichern"}</button>{selected.status === "approved" ? <button className="editorial-button editorial-button-secondary" type="button" onClick={() => void persist(true)}>Nach vorne holen</button> : null}</div>
          </form>
        ) : <p className="editorial-muted">Die Bretter zeigen alle aktiven Poster. Wähle links ein Poster zur Platzierung aus.</p>}
      </div>
      <section className="editorial-rejected-section" aria-labelledby="rejected-posters-heading">
        <h2 id="rejected-posters-heading">Abgelehnte Poster</h2>
        <p className="editorial-muted">Wird 30 Tage nach Ablehnung automatisch gelöscht.</p>
        {rejectedPosters.length === 0 ? <p className="editorial-muted">Keine abgelehnten Poster.</p> : <ul className="editorial-rejected-list">{rejectedPosters.map((poster) => (
          <li key={poster.id}><button className={poster.id === selectedId ? "editorial-article-link editorial-article-link-active" : "editorial-article-link"} type="button" onClick={() => select(poster)}><strong>{poster.title}</strong><span>Abgelehnt{poster.expiresAt ? ` · bis ${poster.expiresAt}` : ""}</span></button></li>
        ))}</ul>}
      </section>
    </div>
  );
}
