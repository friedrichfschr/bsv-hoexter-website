import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  eventModerationMutationSchema,
  moderatedEventSchema,
  moderatedPosterSchema,
  noticeBoardContentSchema,
  posterModerationMutationSchema,
  type ModeratedEvent,
  type ModeratedPoster,
  type NoticeBoardContent,
} from "@/features/notice-board/domain/moderation";
import {
  submissionIncludesEvent,
  submissionRequiresPoster,
  submissionSchema,
  type BoardSubmission,
} from "@/features/notice-board/domain/submission";
import { readStoredUpload, removeStoredUpload, type StoredUpload } from "@/shared/server/uploads";
import { readValidatedJson, withSerializedMutation, writeJsonAtomically } from "@/shared/server/json-file-store";

const emptyNoticeBoardContent: NoticeBoardContent = { events: [], posters: [] };

export function resolveNoticeBoardDirectory(environment: NodeJS.ProcessEnv = process.env) {
  return path.resolve(/* turbopackIgnore: true */ environment.EDITORIAL_CONTENT_DIRECTORY || ".editorial-content");
}

async function writeNoticeBoardFile(directory: string, content: NoticeBoardContent) {
  await writeJsonAtomically(path.join(directory, "notice-board.json"), content);
}

export async function readNoticeBoardContent(directory = resolveNoticeBoardDirectory()): Promise<NoticeBoardContent> {
  return readValidatedJson(path.join(directory, "notice-board.json"), noticeBoardContentSchema, emptyNoticeBoardContent);
}

async function mutateNoticeBoardContent<T>(directory: string, mutation: (content: NoticeBoardContent) => { content: unknown; result: T } | Promise<{ content: unknown; result: T }>) {
  return withSerializedMutation(path.join(directory, "notice-board.json"), async () => {
    const current = await readNoticeBoardContent(directory);
    const changed = await mutation(current);
    const content = noticeBoardContentSchema.parse(changed.content);
    await writeNoticeBoardFile(directory, content);
    return changed.result;
  });
}

export async function createNoticeBoardSubmission(
  directory: string,
  input: unknown,
  upload?: StoredUpload,
  now = new Date(),
) {
  try {
    const submission = submissionSchema.parse(input);
    if (submissionRequiresPoster(submission.submissionKind)) {
      if (!upload) throw new Error("Bitte eine Posterdatei auswählen.");
      if (!upload.mediaType.startsWith("image/")) throw new Error("Poster müssen als PNG, JPEG oder WebP eingereicht werden.");
    }
    const timestamp = now.toISOString();
    return await mutateNoticeBoardContent(directory, (content) => {
      const event = submissionIncludesEvent(submission.submissionKind) ? eventFromSubmission(submission, timestamp) : undefined;
      const poster = submissionRequiresPoster(submission.submissionKind) && upload
        ? posterFromSubmission(submission, upload, event?.id ?? "", timestamp)
        : undefined;
      return {
        content: {
          events: event ? [...content.events, event] : content.events,
          posters: poster ? [...content.posters, poster] : content.posters,
        },
        result: { event, poster },
      };
    });
  } catch (error) {
    if (upload) await removeStoredUpload(path.join(directory, "board-media"), upload);
    throw error;
  }
}

function eventFromSubmission(submission: BoardSubmission, timestamp: string): ModeratedEvent {
  return moderatedEventSchema.parse({
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    status: "pending",
    title: submission.title,
    description: submission.description,
    date: submission.date,
    location: submission.location,
    ageRange: submission.ageRange,
    website: submission.website,
    organizer: submission.organizer,
    category: submission.category,
    contactName: submission.contactName,
    contactEmail: submission.contactEmail,
  });
}

function posterFromSubmission(submission: BoardSubmission, upload: StoredUpload, eventId: string, timestamp: string): ModeratedPoster {
  return moderatedPosterSchema.parse({
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    status: "pending",
    title: submission.title,
    contactName: submission.contactName,
    contactEmail: submission.contactEmail,
    mediaId: upload.id,
    eventId,
    expiresAt: submission.posterExpiresAt,
    layer: 0,
  });
}

export async function updateEventEntry(directory: string | undefined, id: string, input: unknown, now = new Date()) {
  directory ??= resolveNoticeBoardDirectory();
  const mutation = eventModerationMutationSchema.parse(input);
  return mutateNoticeBoardContent(directory, (content) => {
    const existing = content.events.find((event) => event.id === id);
    if (!existing) throw new Error("Veranstaltung nicht gefunden.");
    const event = moderatedEventSchema.parse({
      ...existing,
      ...mutation,
      rejectedAt: mutation.status === "rejected" ? existing.rejectedAt ?? now.toISOString() : undefined,
      updatedAt: now.toISOString(),
    });
    return {
      content: { ...content, events: content.events.map((item) => item.id === id ? event : item) },
      result: event,
    };
  });
}

export async function updatePosterEntry(directory: string | undefined, id: string, input: unknown, now = new Date()) {
  directory ??= resolveNoticeBoardDirectory();
  const mutation = posterModerationMutationSchema.parse(input);
  return mutateNoticeBoardContent(directory, async (content) => {
    const existing = content.posters.find((poster) => poster.id === id);
    if (!existing) throw new Error("Poster nicht gefunden.");
    if (mutation.status === "approved") {
      const mediaDirectory = path.join(directory, "board-media");
      const upload = await readStoredUpload(mediaDirectory, existing.mediaId);
      if (!upload || !upload.mediaType.startsWith("image/")) throw new Error("Posterdatei nicht gefunden.");
      try {
        await readFile(path.join(mediaDirectory, upload.storedName));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("Posterdatei nicht gefunden.");
        throw error;
      }
    }
    const movesToFront = mutation.status === "approved" && (existing.status !== "approved" || mutation.bringToFront);
    const nextLayer = movesToFront ? Math.max(0, ...content.posters.map((poster) => poster.layer)) + 1 : existing.layer;
    const poster = moderatedPosterSchema.parse({
      ...existing,
      status: mutation.status,
      expiresAt: mutation.expiresAt,
      placement: mutation.placement,
      layer: nextLayer,
      rejectedAt: mutation.status === "rejected" ? existing.rejectedAt ?? now.toISOString() : undefined,
      updatedAt: now.toISOString(),
    });
    return {
      content: { ...content, posters: content.posters.map((item) => item.id === id ? poster : item) },
      result: poster,
    };
  });
}

export function publicEventEntries(content: NoticeBoardContent) {
  return content.events.filter((event) => event.status === "approved").sort((a, b) => a.date.localeCompare(b.date));
}

export function publicPosterEntries(content: NoticeBoardContent, currentDate: string) {
  return content.posters
    .filter((poster) => poster.status === "approved" && Boolean(poster.placement) && poster.expiresAt > currentDate)
    .sort((a, b) => a.layer - b.layer);
}

const REJECTED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function purgeRejectedEntries(directory = resolveNoticeBoardDirectory(), now = new Date()) {
  const removedPosters: ModeratedPoster[] = [];
  const cutoff = now.getTime() - REJECTED_RETENTION_MS;
  const content = await mutateNoticeBoardContent(directory, (current) => {
    const events = current.events.filter((event) => event.status !== "rejected" || new Date(event.rejectedAt ?? event.updatedAt).getTime() > cutoff);
    const posters = current.posters.filter((poster) => {
      const remove = poster.status === "rejected" && new Date(poster.rejectedAt ?? poster.updatedAt).getTime() <= cutoff;
      if (remove) removedPosters.push(poster);
      return !remove;
    });
    return { content: { events, posters }, result: { events, posters } };
  });
  const mediaDirectory = path.join(directory, "board-media");
  for (const poster of removedPosters) {
    const upload = await readStoredUpload(mediaDirectory, poster.mediaId);
    if (upload) await removeStoredUpload(mediaDirectory, upload);
  }
  return content;
}
