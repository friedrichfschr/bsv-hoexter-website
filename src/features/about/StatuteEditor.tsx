import type { AboutContent } from "@/features/about/domain/content-schema";
import { FieldLabel } from "@/features/about/AboutEditorFields";
import { appendStatute, updateCollectionItem } from "@/features/about/about-editor-state";

type Props = {
  about: AboutContent;
  onChange: (about: AboutContent) => void;
  onRemove: (index: number) => void;
  onUpload: (file: File | undefined, replacedId?: string) => Promise<string>;
  onError: (message: string) => void;
};

export function StatuteEditor({ about, onChange, onRemove, onUpload, onError }: Props) {
  function update(index: number, document: AboutContent["documents"][number]) {
    onChange(updateCollectionItem(about, "documents", index, document));
  }

  return <section>
    <div className="editorial-form-heading"><h2>Satzungen</h2><button className="editorial-button editorial-button-secondary" type="button" onClick={() => onChange(appendStatute(about))}>Satzung hinzufügen</button></div>

    {about.documents.map((document, index) => document.kind === "satzung" ? <details key={index} className="about-editor-record">
      <summary><span><strong>{document.title || `Satzung ${index + 1}`}</strong><small>Satzung Nr. {document.number || "–"}</small></span></summary>
      <fieldset aria-label={`Dokument ${index + 1}`}><legend>Satzung {index + 1}</legend>
        <button className="editorial-button editorial-button-danger about-editor-remove" type="button" onClick={() => onRemove(index)}>Dokument entfernen</button>
        <div className="editorial-form-grid">
          <div><label><FieldLabel hint="Pflichtfeld · 3–180 Zeichen">Titel</FieldLabel></label><input aria-label={`Titel Dokument ${index + 1}`} minLength={3} maxLength={180} value={document.title} onChange={(event) => update(index, { ...document, title: event.target.value, fileName: `${event.target.value}.pdf` })} required /></div>
          <div><label><FieldLabel hint="Pflichtfeld · maximal 40 Zeichen">Nummer</FieldLabel></label><input aria-label={`Nummer Satzung ${index + 1}`} maxLength={40} value={document.number} onChange={(event) => update(index, { ...document, number: event.target.value })} required /></div>
          <div><label><FieldLabel hint="Pflichtfeld · das Ende wird aus der nächsten Satzung berechnet">Gültig ab</FieldLabel></label><input aria-label={`Gültig ab Satzung ${index + 1}`} type="date" value={document.effectiveFrom} onChange={(event) => update(index, { ...document, date: event.target.value, effectiveFrom: event.target.value })} required /></div>
        </div>
        <label><FieldLabel hint="Genau eine PDF ist erforderlich · wird direkt dieser Satzung zugeordnet">PDF ersetzen oder hochladen</FieldLabel></label><input aria-label={`PDF Dokument ${index + 1}`} type="file" accept="application/pdf" onChange={async (event) => { try { const mediaId = await onUpload(event.target.files?.[0], document.mediaId); update(index, { ...document, mediaId, bundledFile: mediaId ? "" : document.bundledFile }); } catch (reason) { onError(reason instanceof Error ? reason.message : "PDF konnte nicht hochgeladen werden."); } }} />
        <small>{document.bundledFile ? `Gebündelte Datei: ${document.bundledFile}` : document.mediaId ? `Upload: ${document.mediaId}` : "Noch keine Datei"}</small>
      </fieldset>
    </details> : null)}
  </section>;
}
