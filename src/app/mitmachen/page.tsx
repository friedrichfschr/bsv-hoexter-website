import type { Metadata } from "next";
import Link from "next/link";
import { selectPublicBdkEvent } from "@/features/bdk/domain/event";
import { bdkEventDetails, berlinCalendarDate } from "@/features/bdk/domain/presentation";
import { createBdkRepository } from "@/features/bdk/server/repository";

export const metadata: Metadata = {
  title: "Mitmachen - BDK | BSV Höxter",
  description: "Bei der Bezirksdelegiertenkonferenz der BSV Höxter mitmachen und eigene Themen einbringen.",
};
export const dynamic = "force-dynamic";

export default async function ParticipatePage() {
  const state = await createBdkRepository().read();
  const event = selectPublicBdkEvent(state.event, berlinCalendarDate());
  const details = event ? bdkEventDetails(event) : undefined;

  return (
    <section className="bdk-page shell" aria-labelledby="bdk-heading">
      <header className="bdk-hero">
        <p className="news-eyebrow">Bezirksdelegiertenkonferenz</p>
        <h1 id="bdk-heading">Mitmachen - BDK</h1>
        <p className="bdk-intro">Die BDK bringt die Schülervertretungen im Kreis Höxter zusammen. Hier könnt ihr Erfahrungen austauschen, gemeinsame Anliegen beraten und die Arbeit der BSV mitgestalten.</p>
      </header>

      <section className="bdk-next" aria-labelledby="bdk-next-heading">
        <div>
          <p className="bdk-status-label">Nächste BDK</p>
          <h2 id="bdk-next-heading">{event?.title ?? "Termin wird noch bekannt gegeben"}</h2>
          {event?.subtitle ? <p className="bdk-subtitle">{event.subtitle}</p> : null}
          {details ? (
            <dl className="bdk-event-details">
              <div><dt>Datum</dt><dd>{details.date}</dd></div>
              {details.time ? <div><dt>Uhrzeit</dt><dd>{details.time}</dd></div> : null}
              {details.location ? <div><dt>Ort</dt><dd>{details.location}</dd></div> : null}
            </dl>
          ) : <p>Die Redaktion bereitet den nächsten Termin vor.</p>}
          {event ? (
            <div className="bdk-public-actions">
              <Link className="bdk-primary-action" href="/mitmachen/anmelden">Für die BDK anmelden</Link>
              {event.invitationId ? <Link className="editorial-button editorial-button-secondary" href="/api/bdk/dokumente/invitation">Einladung herunterladen</Link> : null}
              {event.delegateKeyId ? <Link className="editorial-button editorial-button-secondary" href="/api/bdk/dokumente/delegate-key">Delegiertenschlüssel herunterladen</Link> : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="bdk-involvement" aria-labelledby="bdk-involvement-heading">
        <header>
          <p className="news-eyebrow">So kannst du mitmachen</p>
          <h2 id="bdk-involvement-heading">Deine Perspektive gehört dazu</h2>
        </header>
        <div className="bdk-involvement-list">
          <article><h3>Deine Schule vertreten</h3><p>Sprich mit deiner Schülervertretung darüber, welche Themen aus eurer Schule auf Kreisebene wichtig sind, und bringt sie gemeinsam in die BDK ein.</p></article>
          <article><h3>Themen und Anträge einbringen</h3><p>Aus Ideen, Problemen und Erfahrungen können gemeinsame Vorhaben entstehen. Bereite dein Anliegen kurz vor und tausche dich mit anderen Schulen dazu aus.</p></article>
          <article><h3>In der BSV weiterarbeiten</h3><p>Auch zwischen den Konferenzen kannst du Arbeitsgruppen unterstützen, Projekte mitorganisieren oder bei der Kommunikation mit den Schulen helfen.</p></article>
        </div>
      </section>
    </section>
  );
}
