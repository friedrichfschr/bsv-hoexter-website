import type { ReactNode } from "react";

export function FieldLabel({ children, hint }: { children: ReactNode; hint: string }) {
  return <span className="about-field-label"><span>{children}</span><small>{hint}</small></span>;
}
