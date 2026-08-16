import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { selectPublicBdkEvent } from "@/features/bdk/domain/event";
import type { BdkRepository } from "@/features/bdk/server/repository";
import { createBdkRepository, resolveBdkDirectory } from "@/features/bdk/server/repository";
import type { StoredUpload } from "@/shared/server/uploads";
import { readStoredUpload, removeStoredUpload, storeUpload } from "@/shared/server/uploads";

export const bdkDocumentKindSchema = z.enum(["invitation", "delegate-key"]);
export type BdkDocumentKind = z.infer<typeof bdkDocumentKindSchema>;

function documentId(event: { invitationId: string; delegateKeyId: string }, kind: BdkDocumentKind) {
  return kind === "invitation" ? event.invitationId : event.delegateKeyId;
}

export class BdkDocumentService {
  constructor(private readonly repository: BdkRepository, private readonly mediaDirectory: string) {}

  async upload(kindInput: string, file: File) {
    const parsedKind = bdkDocumentKindSchema.safeParse(kindInput);
    if (!parsedKind.success) throw new Error("Ungültige Dokumentart.");
    if (file.type !== "application/pdf") throw new Error("Bitte eine PDF-Datei auswählen.");
    const state = await this.repository.read();
    if (parsedKind.data === "invitation" && !state.event.date) {
      throw new Error("Bitte zuerst einen Termin für die BDK festlegen.");
    }

    const stored = await storeUpload(this.mediaDirectory, file);
    let previousId = "";
    try {
      ({ previousId } = await this.repository.setDocument(parsedKind.data, stored.id, state.event.id));
    } catch (error) {
      await removeStoredUpload(this.mediaDirectory, stored);
      throw error;
    }
    if (previousId && previousId !== stored.id) await this.removeStored(previousId);
    return stored;
  }

  async remove(kindInput: string) {
    const kind = bdkDocumentKindSchema.parse(kindInput);
    const state = await this.repository.read();
    const { previousId } = await this.repository.setDocument(kind, "", state.event.id);
    if (previousId) await this.removeStored(previousId);
  }

  async readPublic(kindInput: string, today: string) {
    const parsedKind = bdkDocumentKindSchema.safeParse(kindInput);
    if (!parsedKind.success) return undefined;
    const state = await this.repository.read();
    const event = selectPublicBdkEvent(state.event, today);
    if (!event) return undefined;
    const id = documentId(event, parsedKind.data);
    if (!id) return undefined;
    const metadata = await readStoredUpload(this.mediaDirectory, id);
    if (!metadata || metadata.mediaType !== "application/pdf") return undefined;
    try {
      const bytes = await readFile(path.join(this.mediaDirectory, metadata.storedName));
      return { ...metadata, bytes };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  async prepareNewEvent(today?: string) {
    const { event, previousDocumentIds } = await this.repository.prepareNewEvent(today);
    await Promise.all(previousDocumentIds.map((id) => this.removeStored(id)));
    return event;
  }

  private async removeStored(id: string) {
    const upload = await readStoredUpload(this.mediaDirectory, id);
    if (upload) await removeStoredUpload(this.mediaDirectory, upload);
  }
}

export function resolveBdkMediaDirectory(environment: NodeJS.ProcessEnv = process.env) {
  return path.join(resolveBdkDirectory(environment), "media");
}

export function createBdkDocumentService(environment: NodeJS.ProcessEnv = process.env) {
  return new BdkDocumentService(createBdkRepository(environment), resolveBdkMediaDirectory(environment));
}

export function safeBdkDownloadName(kind: BdkDocumentKind, upload: StoredUpload) {
  const fallback = kind === "invitation" ? "bdk-einladung.pdf" : "bdk-delegiertenschluessel.pdf";
  const original = path.basename(upload.originalName).replace(/[^\p{L}\p{N}._-]+/gu, "-");
  return original.toLowerCase().endsWith(".pdf") && original.length <= 180 ? original : fallback;
}
