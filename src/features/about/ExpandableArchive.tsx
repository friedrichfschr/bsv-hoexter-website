import { Children, type ReactNode } from "react";

export function ExpandableArchive({ children, initialCount = 2, label }: { children: ReactNode; initialCount?: number; label: string }) {
  const items = Children.toArray(children);
  const initialItems = items.slice(0, initialCount);
  const remainingItems = items.slice(initialCount);

  return <>
    <div className="about-archive-items">{initialItems}</div>
    {remainingItems.length ? <details className="about-archive-disclosure">
      <summary className="about-archive-expand" role="button">
        <span className="about-archive-show">Alle Einträge im {label} anzeigen</span>
        <span className="about-archive-hide">{label} einklappen</span>
      </summary>
      <div className="about-archive-items">{remainingItems}</div>
    </details> : null}
  </>;
}
