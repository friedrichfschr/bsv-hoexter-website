import type { AboutContent } from "@/features/about/domain/content-schema";
import { FieldLabel } from "@/features/about/AboutEditorFields";
import { emptyBdk, updateCollectionItem } from "@/features/about/about-editor-state";

type Props = {
  about: AboutContent;
  onChange: (about: AboutContent) => void;
  onRemove: (index: number) => void;
  onUpload: (file: File | undefined, replacedId?: string) => Promise<string>;
  onAddDocument: (index: number, file: File | undefined) => Promise<void>;
  onDetachDocument: (index: number, id: string) => void;
  onError: (message: string) => void;
};

export function BdkArchiveEditor({ about, onChange, onRemove, onUpload, onAddDocument, onDetachDocument, onError }: Props) {
  function updateBdk(index: number, bdk: AboutContent["bdks"][number]) {
    onChange(updateCollectionItem(about, "bdks", index, bdk));
  }

  function updateDocument(id: string, value: AboutContent["documents"][number]) {
    onChange({ ...about, documents: about.documents.map((document) => document.id === id ? value : document) });
  }

  return <section>
    <div className="editorial-form-heading"><h2>BDKs</h2><button className="editorial-button editorial-button-secondary" type="button" onClick={() => onChange({ ...about, bdks: [...about.bdks, { ...emptyBdk }] })}>BDK hinzufügen</button></div>
    <p className="editorial-form-note">Jeder BDK-Eintrag enthält direkt seine eigenen PDF-Anhänge und Links.</p>
    {about.bdks.map((bdk, index) => <details key={index} className="about-editor-record">
      <summary><span><strong>{bdk.title || `BDK ${index + 1}`}</strong><small>{bdk.founding ? "Fest hinterlegt · nur Dokumente bearbeitbar" : bdk.date || "Datum noch offen"}</small></span>{bdk.founding ? <mark>Gründungs-BDK</mark> : null}</summary>
      <fieldset aria-label={`BDK ${index + 1}`}><legend>BDK {index + 1}</legend>
        {bdk.founding ? <p className="editorial-form-note">Die Gründungs-BDK und ihre Fotos sind fest hinterlegt. Hier können nur die zugehörigen Dokumente geändert werden.</p> : <>
        <button className="editorial-button editorial-button-danger about-editor-remove" type="button" onClick={() => onRemove(index)}>BDK entfernen</button>
        <div className="editorial-form-grid">
          <div><label><FieldLabel hint="Pflicht · Kleinbuchstaben, Zahlen, Bindestriche · max. 100">ID</FieldLabel></label><input aria-label={`ID BDK ${index + 1}`} maxLength={100} value={bdk.id} pattern="[a-z0-9-]+" onChange={(event) => updateBdk(index, { ...bdk, id: event.target.value })} required /></div>
          <div><label><FieldLabel hint="Pflichtfeld · 3–180 Zeichen">Titel</FieldLabel></label><input aria-label={`Titel BDK ${index + 1}`} minLength={3} maxLength={180} value={bdk.title} onChange={(event) => updateBdk(index, { ...bdk, title: event.target.value })} required /></div>
          <div><label><FieldLabel hint="Optional · maximal 300 Zeichen">Untertitel</FieldLabel></label><input aria-label={`Untertitel BDK ${index + 1}`} maxLength={300} value={bdk.subtitle} onChange={(event) => updateBdk(index, { ...bdk, subtitle: event.target.value })} /></div>
          <div><label><FieldLabel hint="Pflichtfeld">Datum</FieldLabel></label><input aria-label={`Datum BDK ${index + 1}`} type="date" value={bdk.date} onChange={(event) => updateBdk(index, { ...bdk, date: event.target.value })} required /></div>
          <div><label><FieldLabel hint="Optional">Uhrzeit</FieldLabel></label><input aria-label={`Uhrzeit BDK ${index + 1}`} type="time" value={bdk.time} onChange={(event) => updateBdk(index, { ...bdk, time: event.target.value })} /></div>
          <div><label><FieldLabel hint="Optional · 2–180 Zeichen, wenn angegeben">Ort</FieldLabel></label><input aria-label={`Ort BDK ${index + 1}`} minLength={2} maxLength={180} value={bdk.location} onChange={(event) => updateBdk(index, { ...bdk, location: event.target.value })} /></div>
        </div>
        <label><FieldLabel hint="Pflichtfeld · 10–3.000 Zeichen">Zusammenfassung</FieldLabel></label><textarea aria-label={`Zusammenfassung BDK ${index + 1}`} rows={5} minLength={10} maxLength={3000} value={bdk.summary} onChange={(event) => updateBdk(index, { ...bdk, summary: event.target.value })} required />
        </>}
        <fieldset className="about-editor-options about-editor-options-compact"><legend>PDF-Anhänge</legend>
          {bdk.documentIds.filter((id) => about.documents.find((document) => document.id === id)?.kind !== "satzung").map((id, documentIndex) => { const document = about.documents.find((item) => item.id === id); return document ? <div className="about-inline-resource about-inline-resource-compact" key={id}>
            <div><label><FieldLabel hint="Pflicht · 3–180 Zeichen">Titel</FieldLabel></label><input aria-label={`Titel Anhang ${documentIndex + 1} BDK ${index + 1}`} minLength={3} maxLength={180} value={document.title} onChange={(event) => updateDocument(id, { ...document, title: event.target.value, fileName: `${event.target.value}.pdf` })} required /></div>
            <label><FieldLabel hint="PDF · ersetzt nur die Datei dieses Anhangs">PDF ersetzen</FieldLabel></label><input aria-label={`PDF Anhang ${documentIndex + 1} BDK ${index + 1}`} type="file" accept="application/pdf" onChange={async (event) => { try { const mediaId = await onUpload(event.target.files?.[0], document.mediaId); updateDocument(id, { ...document, mediaId, bundledFile: mediaId ? "" : document.bundledFile }); } catch (reason) { onError(reason instanceof Error ? reason.message : "PDF konnte nicht hochgeladen werden."); } }} />
            <button className="editorial-button editorial-button-danger" type="button" onClick={() => onDetachDocument(index, id)}>Anhang löschen</button>
          </div> : null; })}
          <label><FieldLabel hint="PDF · wird sofort direkt diesem Eintrag zugeordnet">Neuen Anhang hochladen</FieldLabel></label><input aria-label={`Neuen Anhang BDK ${index + 1}`} type="file" accept="application/pdf" onChange={async (event) => { try { await onAddDocument(index, event.target.files?.[0]); event.target.value = ""; } catch (reason) { onError(reason instanceof Error ? reason.message : "PDF konnte nicht hochgeladen werden."); } }} />
        </fieldset>
        {!bdk.founding ? <fieldset className="about-editor-links"><legend>Externe Links</legend>{bdk.links.map((link, linkIndex) => <div className="editorial-form-grid" key={`${link.url}-${linkIndex}`}><div><label><FieldLabel hint="Pflichtfeld · 2–120 Zeichen">Linktitel</FieldLabel></label><input aria-label={`Linktitel BDK ${index + 1} Link ${linkIndex + 1}`} minLength={2} maxLength={120} value={link.label} onChange={(event) => updateBdk(index, { ...bdk, links: bdk.links.map((item, itemIndex) => itemIndex === linkIndex ? { ...item, label: event.target.value } : item) })} required /></div><div><label><FieldLabel hint="Pflichtfeld · muss mit https:// beginnen">HTTPS-Adresse</FieldLabel></label><input aria-label={`Adresse BDK ${index + 1} Link ${linkIndex + 1}`} type="url" value={link.url} pattern="https://.*" onChange={(event) => updateBdk(index, { ...bdk, links: bdk.links.map((item, itemIndex) => itemIndex === linkIndex ? { ...item, url: event.target.value } : item) })} required /></div><button className="editorial-button editorial-button-danger" type="button" onClick={() => updateBdk(index, { ...bdk, links: bdk.links.filter((_, itemIndex) => itemIndex !== linkIndex) })}>Link entfernen</button></div>)}<button className="editorial-button editorial-button-secondary" type="button" onClick={() => updateBdk(index, { ...bdk, links: [...bdk.links, { label: "", url: "https://" }] })}>Link hinzufügen</button></fieldset> : null}
      </fieldset>
    </details>)}
  </section>;
}
