import { readFile } from "node:fs/promises";
import path from "node:path";
import { readEditorialContent, resolveEditorialDirectory } from "@/lib/editorial";
import { readStoredUpload } from "@/shared/server/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const content = await readEditorialContent();
  if (!content.articles.some((article) => article.status === "published" && article.imageId === id)) return new Response("Nicht gefunden", { status: 404 });
  const directory = path.join(resolveEditorialDirectory(), "media");
  const metadata = await readStoredUpload(directory, id);
  if (!metadata || !metadata.mediaType.startsWith("image/")) return new Response("Nicht gefunden", { status: 404 });
  const file = await readFile(path.join(directory, metadata.storedName));
  return new Response(new Uint8Array(file), { headers: { "Content-Type": metadata.mediaType, "Cache-Control": "public, max-age=3600" } });
}
