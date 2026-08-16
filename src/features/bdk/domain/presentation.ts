import type { BdkEvent } from "@/features/bdk/domain/event";

export function berlinCalendarDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function bdkEventDetails(event: BdkEvent) {
  const date = event.date
    ? new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" })
      .format(new Date(`${event.date}T12:00:00Z`))
    : "Termin wird noch bekannt gegeben";
  return {
    date,
    time: event.time ? `${event.time} Uhr` : "",
    location: event.location,
  };
}
