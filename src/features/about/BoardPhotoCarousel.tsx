"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "@/features/about/BoardPhotoCarousel.module.css";

type BoardPhoto = { id: string; alt: string };

export function BoardPhotoCarousel({ label, photos, variant = "page" }: { label: string; photos: BoardPhoto[]; variant?: "page" | "modal" }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activePhoto = photos[Math.min(activeIndex, photos.length - 1)];
  if (!activePhoto) return null;
  const hasNavigation = photos.length > 1;

  return <section className={`${styles.carousel} ${variant === "modal" ? styles.modal : ""}`} role="region" aria-label={label}>
    <div className={styles.frame} aria-live="polite">
      <Image src={`/api/about/medien/${activePhoto.id}`} fill sizes="(max-width: 780px) 100vw, 52vw" alt={activePhoto.alt} />
      {hasNavigation ? <>
        <button className={`${styles.arrow} ${styles.previous}`} type="button" aria-label="Vorheriges Bild" disabled={activeIndex === 0} onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}>←</button>
        <button className={`${styles.arrow} ${styles.next}`} type="button" aria-label="Nächstes Bild" disabled={activeIndex === photos.length - 1} onClick={() => setActiveIndex((index) => Math.min(photos.length - 1, index + 1))}>→</button>
      </> : null}
    </div>
    {hasNavigation ? <div className={styles.dots} aria-label="Bild auswählen">{photos.map((photo, index) => <button className={styles.dot} type="button" key={photo.id} aria-label={`Bild ${index + 1} anzeigen`} aria-current={index === activeIndex ? "true" : undefined} onClick={() => setActiveIndex(index)} />)}</div> : null}
  </section>;
}
