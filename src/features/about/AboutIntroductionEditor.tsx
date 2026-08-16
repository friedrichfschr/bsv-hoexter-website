import type { AboutContent } from "@/features/about/domain/content-schema";
import { FieldLabel } from "@/features/about/AboutEditorFields";

type Props = {
  about: AboutContent;
  onChange: (about: AboutContent) => void;
};

export function AboutIntroductionEditor({ about, onChange }: Props) {
  return <section>
    <h2>Einleitung</h2>
    <label htmlFor="about-intro"><FieldLabel hint="Pflichtfeld · 20–12.000 Zeichen">Was wir sind</FieldLabel></label>
    <textarea id="about-intro" rows={5} minLength={20} maxLength={12000} value={about.intro} onChange={(event) => onChange({ ...about, intro: event.target.value })} required />
    <label htmlFor="about-values"><FieldLabel hint="Pflichtfeld · 20–12.000 Zeichen">Wofür wir stehen</FieldLabel></label>
    <textarea id="about-values" rows={5} minLength={20} maxLength={12000} value={about.values} onChange={(event) => onChange({ ...about, values: event.target.value })} required />
  </section>;
}
