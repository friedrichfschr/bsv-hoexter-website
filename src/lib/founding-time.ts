export type FoundingElapsed = {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function berlinClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second")));
}

function addCalendar(base: Date, years: number, months: number) {
  const result = new Date(base);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export function elapsedSinceFounding(date: string, time: string, now = new Date()): FoundingElapsed {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const end = berlinClock(now);
  if (end <= start) return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

  let years = end.getUTCFullYear() - start.getUTCFullYear();
  if (addCalendar(start, years, 0) > end) years -= 1;
  let cursor = addCalendar(start, years, 0);
  let months = (end.getUTCFullYear() - cursor.getUTCFullYear()) * 12 + end.getUTCMonth() - cursor.getUTCMonth();
  if (addCalendar(cursor, 0, months) > end) months -= 1;
  cursor = addCalendar(cursor, 0, months);

  let remaining = end.getTime() - cursor.getTime();
  const days = Math.floor(remaining / 86_400_000);
  remaining -= days * 86_400_000;
  const hours = Math.floor(remaining / 3_600_000);
  remaining -= hours * 3_600_000;
  const minutes = Math.floor(remaining / 60_000);
  remaining -= minutes * 60_000;
  const seconds = Math.floor(remaining / 1000);
  return { years, months, days, hours, minutes, seconds };
}
