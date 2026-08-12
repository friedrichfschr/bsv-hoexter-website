import { readFile } from "node:fs/promises";
import path from "node:path";
import { authorizeEditorialRequest } from "@/lib/editorial-auth";
import { resolveNoticeBoardDirectory } from "@/lib/notice-board-moderation";
import { readStoredUpload } from "@/lib/uploads";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";

export async function GET(request: Request, { params }: Context) {
  if (authorizeEditorialRequest(request) !== "authorized") return new Response("Nicht gefunden", { status: 404 });
  const { id } = await params;
  const directory = path.join(resolveNoticeBoardDirectory(), "board-media");
  const metadata = await readStoredUpload(directory, id);
  if (!metadata || !metadata.mediaType.startsWith("image/")) return new Response("Nicht gefunden", { status: 404 });
  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(directory, metadata.storedName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response("Nicht gefunden", { status: 404 });
    throw error;
  }
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": metadata.mediaType, "Cache-Control": "private, no-store" } });
}