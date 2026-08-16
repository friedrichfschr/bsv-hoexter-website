"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import type { AboutContent } from "@/features/about/domain/content-schema";
import { AboutIntroductionEditor } from "@/features/about/AboutIntroductionEditor";
import { BdkArchiveEditor } from "@/features/about/BdkArchiveEditor";
import { BoardEditor } from "@/features/about/BoardEditor";
import { StatuteEditor } from "@/features/about/StatuteEditor";
import { emptyDocument, type AboutCollection, updateCollectionItem, withBoardPhotos } from "@/features/about/about-editor-state";

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

  function updateCollection<K extends AboutCollection>(collection: K, index: number, value: AboutContent[K][number]) {
    if (about) setAbout(updateCollectionItem(about, collection, index, value));
  }

  async function discardPending(id: string) {
    if (!pendingUploads.current.delete(id)) return;
    await fetch(`/api/redaktion/upload?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined);
  }

  function removeCollectionItem(collection: AboutCollection, index: number) {
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
      for (const photo of board.photos) void discardPending(photo.id);
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

  async function addBoardPhotos(index: number, files: File[]) {
    if (!about || !files.length) return;
    if (about.boards[index].photos.length + files.length > 20) throw new Error("Pro Vorstand sind höchstens 20 Fotos möglich.");
    const uploaded: string[] = [];
    try {
      for (const file of files) uploaded.push(await upload(file));
    } catch (reason) {
      for (const id of uploaded) await discardPending(id);
      throw reason;
    }
    const board = about.boards[index];
    const photos = [...board.photos, ...uploaded.map((id) => ({ id, alt: "" }))];
    updateCollection("boards", index, withBoardPhotos(board, photos));
  }

  async function replaceBoardPhoto(boardIndex: number, photoIndex: number, file: File | undefined) {
    if (!about || !file) return;
    const board = about.boards[boardIndex];
    const photos = [...board.photos];
    photos[photoIndex] = { ...photos[photoIndex], id: await upload(file, photos[photoIndex].id) };
    updateCollection("boards", boardIndex, withBoardPhotos(board, photos));
  }

  function removeBoardPhoto(boardIndex: number, photoIndex: number) {
    if (!about) return;
    const board = about.boards[boardIndex];
    void discardPending(board.photos[photoIndex].id);
    updateCollection("boards", boardIndex, withBoardPhotos(board, board.photos.filter((_, index) => index !== photoIndex)));
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
    <AboutIntroductionEditor about={about} onChange={setAbout} />
    <BoardEditor about={about} onChange={setAbout} onRemove={(index) => removeCollectionItem("boards", index)} onAddPhotos={addBoardPhotos} onReplacePhoto={replaceBoardPhoto} onRemovePhoto={removeBoardPhoto} onError={setError} />
    <StatuteEditor about={about} onChange={setAbout} onRemove={(index) => removeCollectionItem("documents", index)} onUpload={upload} onError={setError} />
    <BdkArchiveEditor about={about} onChange={setAbout} onRemove={(index) => removeCollectionItem("bdks", index)} onUpload={upload} onAddDocument={addBdkDocument} onDetachDocument={detachBdkDocument} onError={setError} />
    {message ? <p className="editorial-success" role="status">{message}</p> : null}{error ? <p className="editorial-error" role="alert">{error}</p> : null}
    <button className="editorial-button" type="submit" disabled={saving}>{saving ? "Wird gespeichert …" : "Alle Über-uns-Inhalte speichern"}</button>
  </form>;
}
