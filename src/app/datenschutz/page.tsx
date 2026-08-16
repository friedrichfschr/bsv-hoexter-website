import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutz | BSV Höxter",
  description: "Vorläufige Datenschutzhinweise zur Anmeldung für eine Bezirksdelegiertenkonferenz der BSV Höxter.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <section className="submission-page shell" aria-labelledby="privacy-heading">
      <header className="submission-header">
        <p className="news-eyebrow">Bearbeitbarer Entwurf · nicht final</p>
        <h1 id="privacy-heading">Datenschutz</h1>
        <p>
          Diese vorläufigen Hinweise beschreiben die Verarbeitung personenbezogener Daten bei der Anmeldung zu einer Bezirksdelegiertenkonferenz (BDK). Sie müssen vor der Veröffentlichung rechtlich geprüft und vervollständigt werden.
        </p>
      </header>

      <div className="submission-form">
        <section aria-labelledby="controller-heading">
          <h2 id="controller-heading">Verantwortliche Stelle</h2>
          <p>Bezirksschülervertretung Kreis Höxter</p>
          <p><strong>TODO vor Veröffentlichung:</strong> Ladungsfähige Anschrift und erreichbaren Datenschutzkontakt ergänzen. Keine persönlichen Kontaktdaten ohne Freigabe eintragen.</p>
        </section>

        <section className="submission-section" aria-labelledby="purpose-heading">
          <h2 id="purpose-heading">Zweck und verarbeitete Angaben</h2>
          <p>Wir verarbeiten die Angaben, um Anmeldungen zur jeweiligen BDK entgegenzunehmen, die Teilnahme zu organisieren und den Anmeldestatus zu verwalten.</p>
          <p>Erfasst werden Vorname, Nachname, Jahrgangsstufe, E-Mail-Adresse, Schule, gewünschte Teilnahmeart, eine freiwillige Nachricht sowie die Bestätigung der Datenschutzhinweise. Zusätzlich speichern wir den Bezug zur BDK und den Status der Anmeldung (aktiv oder abgesagt).</p>
          <p><strong>TODO vor Veröffentlichung:</strong> Rechtsgrundlage und gegebenenfalls die Erforderlichkeit einer Einwilligung rechtlich prüfen und hier konkret benennen.</p>
        </section>

        <section className="submission-section" aria-labelledby="access-heading">
          <h2 id="access-heading">Zugriff und E-Mail</h2>
          <p>Auf die Anmeldungen können nur berechtigte Personen der Redaktion beziehungsweise Administration zugreifen. Die Angaben werden nicht öffentlich angezeigt.</p>
          <p>Derzeit versendet das System keine E-Mails. Insbesondere werden noch keine Anmeldebestätigungen, Absagelinks oder Verwaltungsnachrichten automatisch verschickt.</p>
        </section>

        <section className="submission-section" aria-labelledby="retention-heading">
          <h2 id="retention-heading">Speicherdauer und Löschung</h2>
          <p>Aktive und abgesagte Anmeldungen werden nach Ablauf von 14 Kalendertagen nach dem Datum der zugehörigen BDK beim nächsten Systemzugriff gelöscht. Eine frühere manuelle Löschung ist möglich.</p>
        </section>

        <section className="submission-section" aria-labelledby="rights-heading">
          <h2 id="rights-heading">Deine Rechte</h2>
          <p>Du kannst im Rahmen der gesetzlichen Voraussetzungen Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit verlangen sowie einer Verarbeitung widersprechen. Soweit die Verarbeitung auf einer Einwilligung beruht, kannst du diese mit Wirkung für die Zukunft widerrufen. Außerdem besteht ein Beschwerderecht bei einer zuständigen Datenschutzaufsichtsbehörde.</p>
          <p><strong>TODO vor Veröffentlichung:</strong> Den freigegebenen Kontakt für Datenschutzanfragen und gegebenenfalls die zuständige Aufsichtsbehörde ergänzen.</p>
        </section>
      </div>
    </section>
  );
}
