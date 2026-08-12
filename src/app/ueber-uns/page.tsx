import type { Metadata } from "next";
import Image from "next/image";
import { publishedAboutContent } from "@/lib/about-content";
import { readEditorialContent } from "@/lib/editorial";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Über uns | BSV Höxter", description: "Aufgaben, Bezirksvorstand, Satzung und Geschichte der BSV Höxter." };

function formatDate(date: string) {
  return date.split("-").reverse().join(".");
}

function documentHref(document: { id: string; mediaId: string; bundledFile: string }) {
  return `/api/about/dokumente/${document.id}`;
}

export default async function AboutPage() {
  const about = publishedAboutContent(await readEditorialContent());
  const documentsById = new Map(about.documents.map((document) => [document.id, document]));
  const today = new Date().toISOString().slice(0, 10);
  const archivedBdks = about.bdks.filter((bdk) => !bdk.founding && bdk.date < today);
  const upcomingBdks = about.bdks.filter((bdk) => !bdk.founding && bdk.date >= today);

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
          {about.currentBoard?.photoId ? (
            <div className="about-board-photo"><Image src={`/api/about/medien/${about.currentBoard.photoId}`} fill sizes="(max-width: 780px) 100vw, 52vw" alt={about.currentBoard.photoAlt} /></div>
          ) : <div className="about-board-photo-placeholder" role="img" aria-label="Ein Foto des aktuellen Bezirksvorstands wird ergänzt.">Vorstandsfoto folgt</div>}
          <article className="about-board-message">
            <h3>Aus dem Bezirksvorstand</h3>
            {about.currentBoard?.message ? <p>{about.currentBoard.message}</p> : <p>Ein persönlicher Text des aktuellen Bezirksvorstands wird hier ergänzt.</p>}
          </article>
        </div>
      </section>

      <section className="about-statute" aria-labelledby="current-statute-heading">
        <div><p className="news-eyebrow">Aktuelle Grundlage</p><h2 id="current-statute-heading">Unsere Satzung</h2><p>Die Satzung regelt Aufgaben, Organe, Wahlen und die demokratische Arbeit der BSV Höxter.</p></div>
        {about.currentStatute ? <a className="bdk-primary-action" href={documentHref(about.currentStatute)}>Satzung vom {formatDate(about.currentStatute.date)} öffnen</a> : <p>Aktuell ist keine Satzung veröffentlicht.</p>}
      </section>

      <section className="about-archive" aria-labelledby="archive-heading">
        <header className="about-section-heading"><p className="news-eyebrow">Dokumentation</p><h2 id="archive-heading">Archiv</h2></header>
        <div className="about-archive-grid">
          <section><h3>Frühere Bezirksvorstände</h3>{about.previousBoards.length ? <ul>{about.previousBoards.map((board) => <li key={board.id}><strong>{board.term}</strong><span>{formatDate(board.startDate)}{board.endDate ? ` – ${formatDate(board.endDate)}` : ""}</span></li>)}</ul> : <p>Noch keine früheren Bezirksvorstände im Archiv.</p>}</section>
          <section><h3>Frühere Satzungen</h3>{about.previousStatutes.length ? <ul>{about.previousStatutes.map((document) => <li key={document.id}><a href={documentHref(document)}>{document.title}</a><span>{formatDate(document.date)}</span></li>)}</ul> : <p>Noch keine früheren Satzungen im Archiv.</p>}</section>
          <section><h3>BDKs, Protokolle und Dateien</h3>{archivedBdks.length ? <ul>{archivedBdks.map((bdk) => <li key={bdk.id}><strong>{bdk.title}</strong><span>{formatDate(bdk.date)} · {bdk.location}</span><p>{bdk.summary}</p>{bdk.documentIds.map((id) => { const document = documentsById.get(id); return document ? <a key={id} href={documentHref(document)}>{document.title}</a> : null; })}</li>)}</ul> : <p>Noch keine weiteren BDKs im Archiv.</p>}</section>
        </div>
      </section>

      {upcomingBdks.length ? <section className="about-upcoming-bdks" aria-labelledby="upcoming-bdks-heading"><header className="about-section-heading"><p className="news-eyebrow">Ausblick</p><h2 id="upcoming-bdks-heading">Kommende BDKs</h2></header>{upcomingBdks.map((bdk) => <article key={bdk.id}><h3>{bdk.title}</h3><p>{bdk.summary}</p><p><strong>{formatDate(bdk.date)}</strong> · {bdk.location}</p></article>)}</section> : null}

      {about.foundingBdk ? <section className="about-founding" aria-labelledby="founding-heading">
        <div><p className="news-eyebrow">Unsere Gründung</p><h2 id="founding-heading">Gegründet am {formatDate(about.foundingBdk.date)}</h2><p>{about.foundingBdk.summary}</p><p><strong>Ort:</strong> {about.foundingBdk.location}</p></div>
        <div className="about-founding-files">{about.foundingBdk.documentIds.map((id) => { const document = documentsById.get(id); return document ? <a key={id} href={documentHref(document)}>{document.title}</a> : null; })}</div>
      </section> : null}
    </section>
  );
}
