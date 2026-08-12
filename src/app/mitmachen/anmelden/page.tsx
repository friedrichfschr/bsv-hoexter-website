import type { Metadata } from "next";
import Link from "next/link";
import { BdkSignupForm } from "@/features/bdk/BdkSignupForm";

export const metadata: Metadata = {
  title: "Zur nächsten BDK anmelden | BSV Höxter",
  description: "Interesse an der nächsten Bezirksdelegiertenkonferenz der BSV Höxter vormerken.",
  robots: { index: false, follow: false },
};

export default function BdkSignupPage() {
  return (
    <section className="submission-page shell" aria-labelledby="bdk-signup-heading">
      <Link className="submission-back-link" href="/mitmachen">← Zurück zu Mitmachen - BDK</Link>
      <header className="submission-header">
        <p className="news-eyebrow">Nächste Bezirksdelegiertenkonferenz</p>
        <h1 id="bdk-signup-heading">Zur nächsten BDK anmelden</h1>
        <p className="bdk-signup-date"><strong>Der Termin steht noch nicht fest</strong></p>
        <p>Mit dieser Anmeldung merkst du dein Interesse vor. Wir informieren dich per E-Mail, sobald Datum, Ort und Ablauf bestätigt sind.</p>
      </header>
      <BdkSignupForm />
    </section>
  );
}
