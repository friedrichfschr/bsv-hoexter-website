import { readFile } from "node:fs/promises";
import path from "node:path";
import { readEditorialContent, resolveEditorialDirectory } from "@/lib/editorial";
import { readStoredUpload } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const content = await readEditorialContent();
  const document = content.documents.find((item) => item.status === "published" && item.mediaId === id);
  if (!document) return new Response("Nicht gefunden", { status: 404 });
  const directory = path.join(resolveEditorialDirectory(), "media");
  const metadata = await readStoredUpload(directory, id);
  if (!metadata) return new Response("Nicht gefunden", { status: 404 });
  const file = await readFile(path.join(directory, metadata.storedName));
  const safeName = document.fileName.replace(/["\\\r\n]/g, "-");
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": metadata.mediaType,
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
