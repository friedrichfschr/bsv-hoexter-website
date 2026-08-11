export const eventSubmissionCategories = ["Freizeit", "Berufsorientierung", "Hobbys"] as const;
export const eventCategories = ["Alle", ...eventSubmissionCategories] as const;

export type EventCategory = Exclude<(typeof eventCategories)[number], "Alle">;

export type EventSession = {
  start: string;
  end: string;
  allDay?: boolean;
};

export type BsvEvent = {
  slug: string;
  title: string;
  summary: string;
  description: string[];
  category: EventCategory;
  start: string;
  end: string;
  allDay?: boolean;
  dateExact?: boolean;
  sessions?: EventSession[];
  dateLabel: string;
  timeLabel?: string;
  location: string;
  city: string;
  address?: string;
  target: string;
  ageRange: string;
  price: string;
  deadline?: string;
  organizer: string;
  sourceName: string;
  sourceUrl: string;
  checkedAt: string;
  featured?: boolean;
};

export type EventFilters = {
  query: string;
  category: (typeof eventCategories)[number];
  location: string;
};

export const events: BsvEvent[] = [];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("de");
}

export function berlinLocalTimestamp(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

export function isCurrentEvent(event: BsvEvent, now = new Date()) {
  const current = berlinLocalTimestamp(now);
  return event.allDay ? current.slice(0, 10) < event.end.slice(0, 10) : current < event.end.slice(0, 19);
}

export function filterEvents(items: BsvEvent[], filters: EventFilters, now = new Date()) {
  const query = normalize(filters.query.trim());
  return items
    .filter((event) => isCurrentEvent(event, now))
    .filter((event) => filters.category === "Alle" || event.category === filters.category)
    .filter((event) => filters.location === "Alle" || event.city === filters.location)
    .filter((event) => !query || normalize([event.title, event.summary, event.description.join(" "), event.organizer, event.category].join(" ")).includes(query))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function getEvent(slug: string) {
  return events.find((event) => event.slug === slug);
}
