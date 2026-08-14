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
  const about = publishedAboutContent(await readEditorialContent());
  const managedMedia = about.media.find((media) => media.id === id);
  const boardPhoto = about.boards.some((board) => board.photoId === id);
  if (!managedMedia && !boardPhoto) return new Response("Nicht gefunden", { status: 404 });
  if (managedMedia?.bundledFile) {
    try {
      const bytes = await readFile(path.join(process.cwd(), "content", "about-images", managedMedia.bundledFile));
      const extension = path.extname(managedMedia.bundledFile).toLowerCase();
      const mediaType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
      return new Response(new Uint8Array(bytes), { headers: { "Content-Type": mediaType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response("Nicht gefunden", { status: 404 });
      throw error;
    }
  }
  const directory = path.join(resolveEditorialDirectory(), "media");
  const metadata = await readStoredUpload(directory, managedMedia?.mediaId || id);
  if (!metadata || !metadata.mediaType.startsWith("image/")) return new Response("Nicht gefunden", { status: 404 });
  try {
    const bytes = await readFile(path.join(directory, metadata.storedName));
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": metadata.mediaType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response("Nicht gefunden", { status: 404 });
    throw error;
  }
}
