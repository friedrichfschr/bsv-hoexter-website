import { readFile } from "node:fs/promises";
import path from "node:path";
import { publishedAboutContent } from "@/features/about/server/content-service";
import { readEditorialContent, resolveEditorialDirectory } from "@/lib/editorial";
import { readStoredUpload } from "@/shared/server/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const document = publishedAboutContent(await readEditorialContent()).documents.find((item) => item.id === id);
  if (!document) return new Response("Nicht gefunden", { status: 404 });
  try {
    let bytes: Buffer;
    if (document.mediaId) {
      const directory = path.join(resolveEditorialDirectory(), "media");
      const metadata = await readStoredUpload(directory, document.mediaId);
      if (!metadata || metadata.mediaType !== "application/pdf") return new Response("Nicht gefunden", { status: 404 });
      bytes = await readFile(path.join(directory, metadata.storedName));
    } else {
      bytes = await readFile(path.join(process.cwd(), "content", "about-documents", document.bundledFile));
    }
    const safeName = document.fileName.replace(/["\\\r\n]/g, "-");
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${safeName}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response("Nicht gefunden", { status: 404 });
    throw error;
  }
}
