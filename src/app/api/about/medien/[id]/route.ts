import { readFile } from "node:fs/promises";
import path from "node:path";
import { publishedAboutContent } from "@/lib/about-content";
import { readEditorialContent, resolveEditorialDirectory } from "@/lib/editorial";
import { readStoredUpload } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!publishedAboutContent(await readEditorialContent()).boards.some((board) => board.photoId === id)) return new Response("Nicht gefunden", { status: 404 });
  const directory = path.join(resolveEditorialDirectory(), "media");
  const metadata = await readStoredUpload(directory, id);
  if (!metadata || !metadata.mediaType.startsWith("image/")) return new Response("Nicht gefunden", { status: 404 });
  try {
    const bytes = await readFile(path.join(directory, metadata.storedName));
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": metadata.mediaType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response("Nicht gefunden", { status: 404 });
    throw error;
  }
}
