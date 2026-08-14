import type { Metadata } from "next";
import Image from "next/image";
import { publishedAboutContent } from "@/lib/about-content";
import type { AboutContent } from "@/lib/about-schema";
import { readEditorialContent } from "@/lib/editorial";
import { BoardPhotoCarousel } from "@/features/about/BoardPhotoCarousel";
import { ExpandableArchive } from "@/features/about/ExpandableArchive";
import { EntryPreview } from "@/features/about/EntryPreview";
import { FoundingCounter } from "@/features/about/FoundingCounter";
import { elapsedSinceFounding } from "@/lib/founding-time";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Über uns | BSV Höxter", description: "Aufgaben, Bezirksvorstand, Satzung und Geschichte der BSV Höxter." };

function formatDate(date: string) {
  return date.split("-").reverse().join(".");
}

function documentHref(document: { id: string }) {
  return `/api/about/dokumente/${document.id}`;
}

function mediaHref(id: string) {
  return `/api/about/medien/${id}`;
}

function BdkEntryLinks({ bdk, documentsById }: { bdk: AboutContent["bdks"][number]; documentsById: Map<string, AboutContent["documents"][number]> }) {
  return <>{bdk.documentIds.map((id) => { const document = documentsById.get(id); return document ? <a key={id} href={documentHref(document)}>{document.title}</a> : null; })}{bdk.links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>)}</>;
}

function validity(from: string, until: string) {
  return `${formatDate(from)} – ${until ? formatDate(until) : "heute"}`;
}

function bdkDetails(date: string, location: string) {
  return [formatDate(date), location].filter(Boolean).join(" · ");
}

export default async function AboutPage() {
  const about = publishedAboutContent(await readEditorialContent());
  const documentsById = new Map(about.documents.map((document) => [document.id, document]));
  const mediaById = new Map(about.media.map((media) => [media.id, media]));
  const today = new Date().toISOString().slice(0, 10);
  const archivedBdks = about.bdks.filter((bdk) => !bdk.founding && bdk.date < today);
  const upcomingBdks = about.bdks.filter((bdk) => !bdk.founding && bdk.date >= today);
  const foundingTime = about.foundingBdk?.time || "00:00";
  const initialFoundingElapsed = about.foundingBdk ? elapsedSinceFounding(about.foundingBdk.date, foundingTime) : undefined;

  return (
    <section className="about-page shell" aria-labelledby="about-heading">
      <header className="about-hero">
        <p className="news-eyebrow">Bezirksschüler*innenvertretung Höxter</p>
        <h1 id="about-heading">Über uns</h1>
        <div className="about-intro-grid">
          <div><h2>Was wir sind</h2><p>{about.intro}</p></div>
          <div><h2>Wofür wir stehen</h2><p>{about.values}</p></div>
        </div>
      </header>

      <section className="about-board-section" aria-labelledby="current-board-heading">
        <div className="about-section-heading"><p className="news-eyebrow">Amtszeit {about.currentBoard?.term}</p><h2 id="current-board-heading">Der aktuelle Bezirksvorstand</h2></div>
        <div className="about-board-layout">
          {about.currentBoard?.photos.length ? <BoardPhotoCarousel label={`Bilder Vorstand ${about.currentBoard.term}`} photos={about.currentBoard.photos} /> : <div className="about-board-photo-placeholder" role="img" aria-label="Ein Foto des aktuellen Bezirksvorstands wird ergänzt.">Vorstandsfoto folgt</div>}
          <article className="about-board-message"><h3>Aus dem Bezirksvorstand</h3>{about.currentBoard?.message ? <EntryPreview title={`Vorstand ${about.currentBoard.term}`} content={about.currentBoard.message} modalMedia={about.currentBoard.photos.length ? <BoardPhotoCarousel label={`Bilder Vorstand ${about.currentBoard.term} im Dialog`} photos={about.currentBoard.photos} variant="modal" /> : undefined} /> : <p>Ein persönlicher Text des aktuellen Bezirksvorstands wird hier ergänzt.</p>}</article>
        </div>
      </section>

      <section className="about-statute" aria-labelledby="current-statute-heading">
        <div><p className="news-eyebrow">Aktuelle Grundlage</p><h2 id="current-statute-heading">Unsere Satzung</h2>{about.currentStatute ? <p>Satzung Nr. {about.currentStatute.number || "–"} · gültig seit {formatDate(about.currentStatute.effectiveFrom)}</p> : <p>Aktuell ist keine Satzung veröffentlicht.</p>}</div>
        {about.currentStatute ? <a className="bdk-primary-action" href={documentHref(about.currentStatute)} download>Satzung herunterladen</a> : null}
      </section>

      <section className="about-archive" aria-labelledby="archive-heading">
        <header className="about-section-heading"><p className="news-eyebrow">Dokumentation</p><h2 id="archive-heading">Archiv</h2></header>
        <div className="about-archive-grid">
          <section aria-labelledby="board-archive-heading"><h3 id="board-archive-heading">Frühere Bezirksvorstände</h3>{about.previousBoards.length ? <ExpandableArchive label="Vorstandsarchiv">{about.previousBoards.map((board) => <article className="about-board-archive-card" key={board.id}>{board.photos[0] ? <div className="about-board-archive-photo"><Image src={mediaHref(board.photos[0].id)} fill sizes="(max-width: 780px) 100vw, 30vw" alt={board.photos[0].alt} /></div> : <div className="about-board-archive-photo-placeholder">Kein Foto hinterlegt</div>}<div><strong>Vorstand {board.term}</strong><span>{validity(board.startDate, board.endDate)}</span>{board.message ? <EntryPreview title={`Vorstand ${board.term}`} content={board.message} modalMedia={board.photos.length ? <BoardPhotoCarousel label={`Bilder Vorstand ${board.term} im Dialog`} photos={board.photos} variant="modal" /> : undefined} /> : <p>Für diesen Vorstand ist noch kein Rückblick hinterlegt.</p>}</div></article>)}</ExpandableArchive> : <p>Noch keine früheren Bezirksvorstände im Archiv.</p>}</section>

          <section aria-labelledby="statute-archive-heading"><h3 id="statute-archive-heading">Frühere Satzungen</h3>{about.previousStatutes.length ? <ExpandableArchive label="Satzungsarchiv">{about.previousStatutes.map((document) => <article className="about-statute-archive-row" key={document.id}><div><strong>Satzung Nr. {document.number || "–"}</strong><span>{validity(document.effectiveFrom, document.effectiveUntil)}</span></div><a href={documentHref(document)} download>Herunterladen</a></article>)}</ExpandableArchive> : <p>Noch keine früheren Satzungen im Archiv.</p>}</section>

          <section aria-labelledby="bdk-archive-heading"><h3 id="bdk-archive-heading">BDKs, Protokolle und Dateien</h3>{archivedBdks.length ? <ExpandableArchive label="BDK-Archiv">{archivedBdks.map((bdk) => <article className="about-bdk-archive-card" key={bdk.id}><strong>{bdk.title}</strong>{bdk.subtitle ? <span>{bdk.subtitle}</span> : null}<small>{bdkDetails(bdk.date, bdk.location)}</small><EntryPreview title={bdk.title} content={bdk.summary} modalActions={bdk.documentIds.length || bdk.links.length ? <BdkEntryLinks bdk={bdk} documentsById={documentsById} /> : undefined} /><div className="about-archive-links"><BdkEntryLinks bdk={bdk} documentsById={documentsById} /></div></article>)}</ExpandableArchive> : <p>Noch keine weiteren BDKs im Archiv.</p>}</section>
        </div>
      </section>

      {upcomingBdks.length ? <section className="about-upcoming-bdks" aria-labelledby="upcoming-bdks-heading"><header className="about-section-heading"><p className="news-eyebrow">Ausblick</p><h2 id="upcoming-bdks-heading">Kommende BDKs</h2></header>{upcomingBdks.map((bdk) => <article key={bdk.id}><h3>{bdk.title}</h3>{bdk.subtitle ? <p>{bdk.subtitle}</p> : null}<EntryPreview title={bdk.title} content={bdk.summary} modalActions={bdk.documentIds.length || bdk.links.length ? <BdkEntryLinks bdk={bdk} documentsById={documentsById} /> : undefined} /><p><strong>{formatDate(bdk.date)}</strong>{bdk.location ? ` · ${bdk.location}` : null}</p>{bdk.documentIds.length || bdk.links.length ? <div className="about-archive-links"><BdkEntryLinks bdk={bdk} documentsById={documentsById} /></div> : null}</article>)}</section> : null}

      {about.foundingBdk ? <section className="about-founding" aria-labelledby="founding-heading">
        <p className="news-eyebrow">Unsere Gründung</p>
        <div className="about-founding-lead">
          <div className="about-founding-copy"><FoundingCounter date={about.foundingBdk.date} time={foundingTime} initialElapsed={initialFoundingElapsed!} /><p>{about.foundingBdk.summary}</p></div>
          <aside className="about-founding-resources" aria-label="Dokumente der Gründungs-BDK"><h3>Dokumente</h3><div className="about-founding-files">{about.foundingBdk.documentIds.map((id) => { const document = documentsById.get(id); return document ? <a key={id} href={documentHref(document)}>{document.title}</a> : null; })}</div></aside>
        </div>
        <div className="about-founding-gallery">{about.foundingBdk.photoIds.map((id) => { const media = mediaById.get(id); return media ? <figure key={id}><div><Image src={mediaHref(media.id)} fill sizes="(max-width: 780px) 100vw, 50vw" alt={media.alt} /></div>{media.caption ? <figcaption>{media.caption}</figcaption> : null}</figure> : null; })}</div>
      </section> : null}
    </section>
  );
}
