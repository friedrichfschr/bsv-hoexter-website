import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mitmachen - BDK | BSV Höxter",
  description: "Bei der Bezirksdelegiertenkonferenz der BSV Höxter mitmachen und eigene Themen einbringen.",
};

export default function ParticipatePage() {
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
          <h2 id="bdk-next-heading">Termin wird noch bekannt gegeben</h2>
          <p>Du kannst dich bereits vormerken. Sobald Datum und weitere Informationen feststehen, melden wir uns bei dir.</p>
        </div>
        <Link className="bdk-primary-action" href="/mitmachen/anmelden">Für die nächste BDK anmelden</Link>
      </section>

      <section className="bdk-involvement" aria-labelledby="bdk-involvement-heading">
        <header>
          <p className="news-eyebrow">So kannst du mitmachen</p>
          <h2 id="bdk-involvement-heading">Deine Perspektive gehört dazu</h2>
        </header>
        <div className="bdk-involvement-list">
          <article>
            <h3>Deine Schule vertreten</h3>
            <p>Sprich mit deiner Schülervertretung darüber, welche Themen aus eurer Schule auf Kreisebene wichtig sind, und bringt sie gemeinsam in die BDK ein.</p>
          </article>
          <article>
            <h3>Themen und Anträge einbringen</h3>
            <p>Aus Ideen, Problemen und Erfahrungen können gemeinsame Vorhaben entstehen. Bereite dein Anliegen kurz vor und tausche dich mit anderen Schulen dazu aus.</p>
          </article>
          <article>
            <h3>In der BSV weiterarbeiten</h3>
            <p>Auch zwischen den Konferenzen kannst du Arbeitsgruppen unterstützen, Projekte mitorganisieren oder bei der Kommunikation mit den Schulen helfen.</p>
          </article>
        </div>
      </section>
    </section>
  );
}
