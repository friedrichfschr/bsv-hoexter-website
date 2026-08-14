import { z } from "zod";

const identifier = z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/);
const optionalIdentifier = z.string().trim().max(100).refine((value) => !value || /^[a-z0-9-]+$/.test(value));
const status = z.enum(["draft", "published"]);

function isValidIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

const isoDate = z.string().refine(isValidIsoDate, "Bitte ein gültiges Datum angeben.");
const optionalIsoDate = z.union([z.literal(""), isoDate]);
const optionalTime = z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]);

export const aboutLinkSchema = z.object({
  label: z.string().trim().min(2).max(120),
  url: z.url().refine((value) => new URL(value).protocol === "https:", "Links müssen HTTPS verwenden."),
});

export const aboutDocumentSchema = z.object({
  id: identifier,
  title: z.string().trim().min(3).max(180),
  kind: z.enum(["satzung", "einladung", "tagesordnung", "protokoll", "sonstiges"]),
  date: isoDate,
  number: z.string().trim().max(40).default(""),
  effectiveFrom: optionalIsoDate.default(""),
  effectiveUntil: optionalIsoDate.default(""),
  status,
  mediaId: optionalIdentifier.default(""),
  bundledFile: z.string().trim().max(120).regex(/^[a-z0-9-]+\.pdf$/).or(z.literal("")).default(""),
  fileName: z.string().trim().min(1).max(180),
}).transform((document) => ({
  ...document,
  effectiveFrom: document.effectiveFrom || document.date,
}));

export const aboutMediaSchema = z.object({
  id: identifier,
  alt: z.string().trim().min(1).max(500),
  caption: z.string().trim().max(500).default(""),
  status,
  mediaId: optionalIdentifier.default(""),
  bundledFile: z.string().trim().max(140).regex(/^[a-z0-9-]+\.(jpg|jpeg|png|webp)$/).or(z.literal("")).default(""),
}).transform((media) => {
  const caption = media.caption || media.alt;
  return { ...media, alt: caption, caption };
});

export const boardTermSchema = z.object({
  id: identifier,
  term: z.string().trim().min(4).max(40),
  startDate: isoDate,
  endDate: optionalIsoDate,
  message: z.string().trim().max(12_000).default(""),
  photoId: optionalIdentifier.default(""),
  photoAlt: z.string().trim().max(240).default(""),
  status,
});

export const bdkRecordSchema = z.object({
  id: identifier,
  title: z.string().trim().min(3).max(180),
  subtitle: z.string().trim().max(300).default(""),
  date: isoDate,
  time: optionalTime.default(""),
  location: z.string().trim().min(2).max(180),
  summary: z.string().trim().min(10).max(3000),
  documentIds: z.array(identifier).max(30),
  photoIds: z.array(identifier).max(20).default([]),
  links: z.array(aboutLinkSchema).max(20).default([]),
  founding: z.boolean().default(false),
  status,
});

const aboutContentObjectSchema = z.object({
  intro: z.string().trim().min(20).max(12_000),
  values: z.string().trim().min(20).max(12_000),
  activeBoardId: optionalIdentifier.default(""),
  boards: z.array(boardTermSchema).max(100),
  bdks: z.array(bdkRecordSchema).max(500),
  documents: z.array(aboutDocumentSchema).max(1000),
  media: z.array(aboutMediaSchema).max(500).default([]),
});

export const aboutContentSchema = aboutContentObjectSchema.transform((content) => ({
  ...content,
  activeBoardId: content.activeBoardId || content.boards.find((board) => board.status === "published" && !board.endDate)?.id || "",
}));

export type AboutContent = z.infer<typeof aboutContentSchema>;

export const defaultAboutContent = aboutContentSchema.parse({
  intro: "Die Bezirksschüler*innenvertretung Höxter ist der Zusammenschluss der Schüler*innenvertretungen aller weiterführenden Schulen im Kreis Höxter. Sie vertritt die gemeinsamen Interessen der Schüler*innen gegenüber Politik, Öffentlichkeit und der Landesschüler*innenvertretung NRW.",
  values: "Wir stehen für demokratische Mitbestimmung, gleichberechtigte Beteiligung und eine enge Zusammenarbeit der Schülervertretungen. Politische, soziale, fachliche, kulturelle und materielle Interessen der Schüler*innen sollen gehört und gemeinsam vertreten werden.",
  activeBoardId: "bezirksvorstand-2026-27",
  boards: [{ id: "bezirksvorstand-2026-27", term: "2026/27", startDate: "2026-07-02", endDate: "", message: "", photoId: "", photoAlt: "", status: "published" }],
  media: [
    { id: "gruendungs-bdk-konferenz-2026", alt: "Schüler*innen arbeiten bei der Gründungs-BDK der BSV Höxter in Gesprächsgruppen.", caption: "Arbeitsphase bei der Gründungs-BDK am 2. Juli 2026.", status: "published", bundledFile: "gruendungs-bdk-konferenz-2026.jpg" },
    { id: "gruendungs-bdk-gruppenfoto-2026", alt: "Gruppenfoto der Teilnehmenden der Gründungs-BDK der BSV Höxter.", caption: "Die Teilnehmenden der ersten Bezirksdelegiertenkonferenz.", status: "published", bundledFile: "gruendungs-bdk-gruppenfoto-2026.jpg" },
  ],
  documents: [
    { id: "satzung-2026", title: "Satzung der BSV Höxter", kind: "satzung", date: "2026-07-02", number: "1", effectiveFrom: "2026-07-02", effectiveUntil: "", status: "published", bundledFile: "satzung-2026.pdf", fileName: "Satzung der BSV Höxter.pdf" },
    { id: "gruendungs-bdk-einladungen-2026", title: "Originale Schuleinladungen zur Gründungs-BDK", kind: "einladung", date: "2026-05-28", status: "published", bundledFile: "gruendungs-bdk-einladungen-2026.pdf", fileName: "Schuleinladungen Gründungs-BDK.pdf" },
    { id: "gruendungs-bdk-tagesordnung-2026", title: "Tagesordnung der Gründungs-BDK", kind: "tagesordnung", date: "2026-07-02", status: "published", bundledFile: "gruendungs-bdk-tagesordnung-2026.pdf", fileName: "Tagesordnung Gründungs-BDK.pdf" },
  ],
  bdks: [{
    id: "gruendungs-bdk-2026",
    title: "1. Bezirksdelegiertenkonferenz – Gründung der BSV Höxter",
    subtitle: "Der gemeinsame Start der kreisweiten Schüler*innenvertretung",
    date: "2026-07-02",
    time: "",
    location: "Schulen der Brede, Brakel",
    summary: "Auf der ersten Bezirksdelegiertenkonferenz wurde die BSV Höxter gegründet. Die Konferenz beriet die Ziele und Satzung der neuen BSV und wählte den ersten Bezirksvorstand sowie die Landesdelegierten.",
    documentIds: ["gruendungs-bdk-einladungen-2026", "gruendungs-bdk-tagesordnung-2026", "satzung-2026"],
    photoIds: ["gruendungs-bdk-konferenz-2026", "gruendungs-bdk-gruppenfoto-2026"],
    links: [],
    founding: true,
    status: "published",
  }],
});
