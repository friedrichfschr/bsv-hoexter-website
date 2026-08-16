import { randomUUID } from "node:crypto";
import path from "node:path";
import type { BdkEvent, BdkEventMutation } from "@/features/bdk/domain/event";
import { createPreparedBdkEvent, hasBdkEventPassed } from "@/features/bdk/domain/event";
import type { BdkSignupInput } from "@/features/bdk/domain/signup";
import { bdkSignupSchema } from "@/features/bdk/domain/signup";
import type { BdkSignupRecord, BdkSignupStatus, BdkState } from "@/features/bdk/domain/state";
import { bdkStateSchema } from "@/features/bdk/domain/state";
import { readValidatedJson, withSerializedMutation, writeJsonAtomically } from "@/shared/server/json-file-store";

const MAX_SIGNUPS = 5000;
const STATE_FILENAME = "bdk.json";

type Clock = () => Date;

export interface BdkRepository {
  read(): Promise<BdkState>;
  updateEvent(input: BdkEventMutation): Promise<BdkEvent>;
  createSignup(input: BdkSignupInput): Promise<BdkSignupRecord>;
  setSignupStatus(id: string, status: BdkSignupStatus): Promise<BdkSignupRecord>;
  deleteSignup(id: string): Promise<void>;
  prepareNewEvent(today?: string): Promise<BdkEvent>;
}

export class DuplicateBdkSignupError extends Error {}
export class BdkRecordNotFoundError extends Error {}
export class BdkEventNotPassedError extends Error {}

function berlinDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addCalendarDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

function removeExpiredSignups(state: BdkState, today: string): BdkState {
  return {
    ...state,
    signups: state.signups.filter((signup) => !signup.eventDate || today <= addCalendarDays(signup.eventDate, 14)),
  };
}

function sameSubmission(record: BdkSignupRecord, input: BdkSignupInput) {
  return JSON.stringify(bdkSignupSchema.parse(record)) === JSON.stringify(input);
}

export class LocalBdkRepository implements BdkRepository {
  private readonly filePath: string;

  constructor(directory: string, private readonly clock: Clock = () => new Date()) {
    this.filePath = path.join(directory, STATE_FILENAME);
  }

  private async transaction<T>(operation: (state: BdkState, now: Date) => T | Promise<T>) {
    return withSerializedMutation(this.filePath, async () => {
      const now = this.clock();
      const empty: BdkState = { event: createPreparedBdkEvent(now), signups: [] };
      const current = removeExpiredSignups(await readValidatedJson(this.filePath, bdkStateSchema, empty), berlinDate(now));
      const result = await operation(current, now);
      bdkStateSchema.parse(current);
      await writeJsonAtomically(this.filePath, current);
      return result;
    });
  }

  read() {
    return this.transaction((state) => structuredClone(state));
  }

  updateEvent(input: BdkEventMutation) {
    return this.transaction((state, now) => {
      const updated = {
        ...state.event,
        ...input,
        updatedAt: now.toISOString(),
      };
      state.event = updated;
      state.signups = state.signups.map((signup) => signup.eventId === updated.id
        ? { ...signup, eventTitle: updated.title, eventDate: updated.date }
        : signup);
      return structuredClone(updated);
    });
  }

  createSignup(input: BdkSignupInput) {
    const normalized = bdkSignupSchema.parse(input);
    return this.transaction((state, now) => {
      if (state.signups.length >= MAX_SIGNUPS) throw new Error("Die maximale Anzahl an Anmeldungen ist erreicht.");
      const existing = state.signups.find((signup) => signup.eventId === state.event.id
        && signup.status === "active"
        && signup.email === normalized.email);
      if (existing) {
        if (sameSubmission(existing, normalized)) return structuredClone(existing);
        throw new DuplicateBdkSignupError("Für diese E-Mail-Adresse liegt bereits eine aktive Anmeldung vor.");
      }
      const record: BdkSignupRecord = {
        ...normalized,
        id: randomUUID(),
        eventId: state.event.id,
        eventTitle: state.event.title,
        eventDate: state.event.date,
        status: "active",
        registeredAt: now.toISOString(),
        cancelledAt: "",
        confirmationSentAt: "",
        cancellationTokenHash: "",
      };
      state.signups.push(record);
      return structuredClone(record);
    });
  }

  setSignupStatus(id: string, status: BdkSignupStatus) {
    return this.transaction((state, now) => {
      const signup = state.signups.find((candidate) => candidate.id === id);
      if (!signup) throw new BdkRecordNotFoundError("Anmeldung nicht gefunden.");
      signup.status = status;
      signup.cancelledAt = status === "cancelled" ? now.toISOString() : "";
      return structuredClone(signup);
    });
  }

  deleteSignup(id: string) {
    return this.transaction((state) => {
      const index = state.signups.findIndex((candidate) => candidate.id === id);
      if (index < 0) throw new BdkRecordNotFoundError("Anmeldung nicht gefunden.");
      state.signups.splice(index, 1);
    });
  }

  prepareNewEvent(today?: string) {
    return this.transaction((state, now) => {
      if (!hasBdkEventPassed(state.event, today ?? berlinDate(now))) {
        throw new BdkEventNotPassedError("Eine neue BDK kann erst nach dem aktuellen Termin vorbereitet werden.");
      }
      state.event = createPreparedBdkEvent(now);
      return structuredClone(state.event);
    });
  }
}

export function resolveBdkDirectory(environment: NodeJS.ProcessEnv = process.env) {
  return environment.BDK_DATA_DIRECTORY
    ?? path.join(environment.EDITORIAL_CONTENT_DIRECTORY ?? path.join(process.cwd(), ".editorial-content"), "bdk");
}

export function createBdkRepository(environment: NodeJS.ProcessEnv = process.env) {
  return new LocalBdkRepository(resolveBdkDirectory(environment));
}
