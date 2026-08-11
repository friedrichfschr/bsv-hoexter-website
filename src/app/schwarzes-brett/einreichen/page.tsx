import type { Metadata } from "next";
import Link from "next/link";
import { SubmissionForm } from "@/features/notice-board/SubmissionForm";

export const metadata: Metadata = {
  title: "Eintrag einreichen | BSV Höxter",
  robots: { index: false, follow: false },
};

export default function SubmissionPage() {
  return (
    <section className="submission-page shell" aria-labelledby="submission-heading">
      <Link className="submission-back-link" href="/schwarzes-brett">← Zurück zum Schwarzen Brett</Link>
      <header className="submission-header">
        <h1 id="submission-heading">Poster oder Veranstaltung einreichen</h1>
        <p>Reiche ein Poster, einen Veranstaltungseintrag oder beides gemeinsam zur Prüfung ein.</p>
      </header>
      <SubmissionForm />
    </section>
  );
}
