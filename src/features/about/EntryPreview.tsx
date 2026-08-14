"use client";

import { type ReactNode, useId, useRef } from "react";
import styles from "@/features/about/EntryPreview.module.css";

const PREVIEW_LENGTH = 240;

function excerpt(content: string) {
  if (content.length <= PREVIEW_LENGTH) return content;
  const candidate = content.slice(0, PREVIEW_LENGTH + 1);
  const boundary = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, boundary > 160 ? boundary : PREVIEW_LENGTH).trimEnd()} …`;
}

export function EntryPreview({ title, content, modalMedia, modalActions }: { title: string; content: string; modalMedia?: ReactNode; modalActions?: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const isLong = content.length > PREVIEW_LENGTH;

  return <div className={styles.root}>
    <p className={styles.preview}>{excerpt(content)}</p>
    {isLong ? <>
      <button className={styles.openButton} type="button" aria-label={`Mehr lesen: ${title}`} onClick={() => dialogRef.current?.showModal()}>Mehr lesen</button>
      <dialog className={styles.dialog} ref={dialogRef} aria-labelledby={titleId} onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        <article className={styles.modal}>
          <header className={styles.header}><h2 id={titleId}>{title}</h2><button className={styles.closeButton} type="button" onClick={() => dialogRef.current?.close()}>Schließen</button></header>
          {modalMedia ? <div className={styles.media}>{modalMedia}</div> : null}
          <p className={styles.content}>{content}</p>
          {modalActions ? <div className={styles.actions}>{modalActions}</div> : null}
        </article>
      </dialog>
      <noscript><p className={styles.content}>{content}</p></noscript>
    </> : null}
  </div>;
}
