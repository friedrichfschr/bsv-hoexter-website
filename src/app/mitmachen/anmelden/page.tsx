import type { Metadata } from "next";
import Link from "next/link";
import { selectPublicBdkEvent } from "@/features/bdk/domain/event";
import { bdkEventDetails, berlinCalendarDate } from "@/features/bdk/domain/presentation";
import { BdkSignupForm } from "@/features/bdk/BdkSignupForm";
import { createBdkRepository } from "@/features/bdk/server/repository";

export const metadata: Metadata = {
  title: "Zur nächsten BDK anmelden | BSV Höxter",
  description: "Für die nächste Bezirksdelegiertenkonferenz der BSV Höxter anmelden.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function BdkSignupPage() {
  const state = await createBdkRepository().read();
  const event = selectPublicBdkEvent(state.event, berlinCalendarDate());
  const details = event ? bdkEventDetails(event) : undefined;

  return (
    <section className="submission-page shell" aria-labelledby="bdk-signup-heading">
      <Link className="submission-back-link" href="/mitmachen">← Zurück zu Mitmachen - BDK</Link>
      <header className="submission-header">
        <p className="news-eyebrow">Nächste Bezirksdelegiertenkonferenz</p>
        <h1 id="bdk-signup-heading">Zur nächsten BDK anmelden</h1>
        {event ? (
          <>
            <p className="bdk-signup-date"><strong>{details?.date}</strong>{details?.time ? ` · ${details.time}` : ""}{details?.location ? ` · ${details.location}` : ""}</p>
            <p>Mit deiner Anmeldung hilfst du der BSV bei der verbindlichen Planung. Eine automatische Bestätigungs-E-Mail wird derzeit nicht versendet.</p>
          </>
        ) : <p className="bdk-signup-date"><strong>Für den vergangenen Termin sind keine Anmeldungen mehr möglich.</strong> Ein neuer Termin wird vorbereitet.</p>}
      </header>
      {event ? <BdkSignupForm /> : <Link className="bdk-primary-action" href="/mitmachen">Zur BDK-Übersicht</Link>}
    </section>
  );
}
