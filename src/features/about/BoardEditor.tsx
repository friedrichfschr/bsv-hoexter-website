import type { AboutContent } from "@/features/about/domain/content-schema";
import { FieldLabel } from "@/features/about/AboutEditorFields";
import { emptyBoard, selectActiveBoard, updateBoardId, updateCollectionItem, withBoardPhotos } from "@/features/about/about-editor-state";

type Props = {
  about: AboutContent;
  onChange: (about: AboutContent) => void;
  onRemove: (index: number) => void;
  onAddPhotos: (index: number, files: File[]) => Promise<void>;
  onReplacePhoto: (boardIndex: number, photoIndex: number, file: File | undefined) => Promise<void>;
  onRemovePhoto: (boardIndex: number, photoIndex: number) => void;
  onError: (message: string) => void;
};

export function BoardEditor({ about, onChange, onRemove, onAddPhotos, onReplacePhoto, onRemovePhoto, onError }: Props) {
  function update(index: number, board: AboutContent["boards"][number]) {
    onChange(updateCollectionItem(about, "boards", index, board));
  }

  return <section>
    <div className="editorial-form-heading"><h2>Bezirksvorstände</h2><button className="editorial-button editorial-button-secondary" type="button" onClick={() => onChange({ ...about, boards: [...about.boards, { ...emptyBoard }] })}>Vorstand hinzufügen</button></div>
    <div className="about-active-board">
      <div><strong>Aktiver Bezirksvorstand</strong><span>Nur diese Auswahl ist aktuell. Alle anderen Vorstände erscheinen nach Beginn im Archiv.</span></div>
      <select aria-label="Aktiver Bezirksvorstand" value={about.activeBoardId} onChange={(event) => onChange(selectActiveBoard(about, event.target.value))} required>
        <option value="">Vorstand auswählen</option>
        {about.boards.map((board, index) => <option value={board.id} key={`${board.id}-${index}`}>{board.term || `Vorstand ${index + 1}`}</option>)}
      </select>
    </div>
    {about.boards.map((board, index) => <details key={index} className="about-editor-record">
      <summary><span><strong>{board.term || `Vorstand ${index + 1}`}</strong><small>Beginn: {board.startDate || "noch offen"}</small></span>{about.activeBoardId === board.id && board.id ? <mark>Aktiver Vorstand</mark> : null}</summary>
      <fieldset aria-label={`Vorstand ${index + 1}`}><legend>Vorstand {index + 1}</legend>
        <button className="editorial-button editorial-button-danger about-editor-remove" type="button" onClick={() => onRemove(index)}>Vorstand entfernen</button>
        <div className="editorial-form-grid">
          <div><label><FieldLabel hint="Pflicht · Kleinbuchstaben, Zahlen, Bindestriche · max. 100">Datensatz-ID</FieldLabel></label><input aria-label={`Datensatz-ID Vorstand ${index + 1}`} value={board.id} maxLength={100} pattern="[a-z0-9-]+" onChange={(event) => onChange(updateBoardId(about, index, event.target.value))} required /></div>
          <div><label><FieldLabel hint="Pflichtfeld · 4–40 Zeichen">Amtszeit</FieldLabel></label><input aria-label={`Amtszeit Vorstand ${index + 1}`} value={board.term} minLength={4} maxLength={40} onChange={(event) => update(index, { ...board, term: event.target.value })} required /></div>
          <div><label><FieldLabel hint="Pflichtfeld">Beginn</FieldLabel></label><input aria-label={`Beginn Vorstand ${index + 1}`} type="date" value={board.startDate} onChange={(event) => update(index, { ...board, startDate: event.target.value })} required /></div>
        </div>
        <label><FieldLabel hint="Optional · maximal 12.000 Zeichen">Text des Bezirksvorstands</FieldLabel></label><textarea aria-label={`Text Vorstand ${index + 1}`} rows={6} maxLength={12000} value={board.message} onChange={(event) => update(index, { ...board, message: event.target.value })} />
        <fieldset className="about-editor-options"><legend>Fotos</legend>
          {board.photos.map((photo, photoIndex) => <div className="about-inline-resource" key={`${photo.id}-${photoIndex}`}>
            <small>Gespeichertes Foto: {photo.id}</small>
            <label><FieldLabel hint="Optional · JPG, PNG oder WebP · ersetzt nur dieses Foto">Foto ersetzen</FieldLabel></label><input aria-label={`Foto ${photoIndex + 1} Vorstand ${index + 1} ersetzen`} type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => { try { await onReplacePhoto(index, photoIndex, event.target.files?.[0]); event.target.value = ""; } catch (reason) { onError(reason instanceof Error ? reason.message : "Foto konnte nicht hochgeladen werden."); } }} />
            <label><FieldLabel hint="Pflichtfeld · beschreibt den Bildinhalt · max. 240 Zeichen">Alternativtext</FieldLabel></label><input aria-label={`Alternativtext Foto ${photoIndex + 1} Vorstand ${index + 1}`} maxLength={240} value={photo.alt} onChange={(event) => update(index, withBoardPhotos(board, board.photos.map((item, itemIndex) => itemIndex === photoIndex ? { ...item, alt: event.target.value } : item)))} required />
            <button className="editorial-button editorial-button-danger" type="button" aria-label={`Foto entfernen: Foto ${photoIndex + 1} Vorstand ${index + 1}`} onClick={() => onRemovePhoto(index, photoIndex)}>Foto entfernen</button>
          </div>)}
          <label><FieldLabel hint="Optional · bis zu 20 JPG-, PNG- oder WebP-Dateien · direkt diesem Vorstand zugeordnet">Fotos hinzufügen</FieldLabel></label><input aria-label={`Fotos Vorstand ${index + 1}`} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={async (event) => { try { await onAddPhotos(index, Array.from(event.target.files ?? [])); event.target.value = ""; } catch (reason) { onError(reason instanceof Error ? reason.message : "Fotos konnten nicht hochgeladen werden."); } }} />
        </fieldset>
      </fieldset>
    </details>)}
  </section>;
}
