import type { BsvEvent, EventSession } from "@/features/notice-board/domain/events";

const berlinFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function compactDate(value: string) {
  return value.slice(0, 10).replaceAll("-", "");
}

function formatUtc(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function berlinLocalToUtc(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid local event timestamp: ${value}`);
  const desired = Date.UTC(...match.slice(1).map(Number).map((part, index) => index === 1 ? part - 1 : part) as [number, number, number, number, number, number]);
  let guess = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = berlinFormatter.formatToParts(new Date(guess));
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
    const represented = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    guess += desired - represented;
  }
  return new Date(guess);
}

function foldLine(line: string) {
  const chunks: string[] = [];
  let current = "";
  for (const character of line) {
    const limit = chunks.length === 0 ? 75 : 74;
    if (current && Buffer.byteLength(current + character, "utf8") > limit) {
      chunks.push(current);
      current = character;
    } else {
      current += character;
    }
  }
  chunks.push(current);
  return chunks.map((chunk, index) => index === 0 ? chunk : ` ${chunk}`).join("\r\n");
}

function sessionDateLines(session: EventSession) {
  if (session.allDay) {
    return [`DTSTART;VALUE=DATE:${compactDate(session.start)}`, `DTEND;VALUE=DATE:${compactDate(session.end)}`];
  }
  return [`DTSTART:${formatUtc(berlinLocalToUtc(session.start))}`, `DTEND:${formatUtc(berlinLocalToUtc(session.end))}`];
}

export function createEventCalendar(event: BsvEvent, generatedAt = new Date()) {
  const sessions: EventSession[] = event.sessions?.length
    ? event.sessions
    : [{ start: event.start, end: event.end, allDay: event.allDay }];
  const location = [event.location, event.address, event.city].filter(Boolean).join(", ");
  const stamp = formatUtc(generatedAt);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BSV Höxter//Schwarzes Brett//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...sessions.flatMap((session, index) => [
      "BEGIN:VEVENT",
      `UID:${event.slug}${sessions.length > 1 ? `-${index + 1}` : ""}@bsv-hoexter.de`,
      `DTSTAMP:${stamp}`,
      ...sessionDateLines(session),
      `SUMMARY:${escapeIcs(event.title)}`,
      `DESCRIPTION:${escapeIcs(`${event.summary} Weitere Informationen beim Veranstalter.`)}`,
      `LOCATION:${escapeIcs(location)}`,
      `URL:${escapeIcs(event.sourceUrl)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
    "",
  ];
  return lines.map(foldLine).join("\r\n");
}
