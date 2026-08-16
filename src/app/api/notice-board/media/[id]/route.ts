import { readFile } from "node:fs/promises";
import path from "node:path";
import { publicPosterEntries, readNoticeBoardContent, resolveNoticeBoardDirectory } from "@/features/notice-board/server/moderation";
import { readStoredUpload } from "@/lib/uploads";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function currentGermanDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const content = await readNoticeBoardContent();
  if (!publicPosterEntries(content, currentGermanDate()).some((poster) => poster.mediaId === id)) return new Response("Nicht gefunden", { status: 404 });
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