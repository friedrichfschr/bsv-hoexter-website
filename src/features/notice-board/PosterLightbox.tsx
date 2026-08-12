"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

type PosterLightboxProps = {
  src: string;
  title: string;
  className: string;
  style: CSSProperties;
};

export function PosterLightbox({ src, title, className, style }: PosterLightboxProps) {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        window.setTimeout(() => trigger.current?.focus());
      }
      if (event.key === "Tab") {
        event.preventDefault();
        closeButton.current?.focus();
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function close() {
    setOpen(false);
    window.setTimeout(() => trigger.current?.focus());
  }

  return (
    <>
      <a ref={trigger} className={`${className} bulletin-board-poster-button`} style={style} href={src} onClick={(event) => { event.preventDefault(); setOpen(true); }} aria-label={`${title} vergrößern`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={title} />
      </a>
      {open ? (
        <div className="poster-lightbox" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <button ref={closeButton} className="poster-lightbox-close" type="button" onClick={close} aria-label="Großansicht schließen">×</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={title} />
        </div>
      ) : null}
    </>
  );
}
