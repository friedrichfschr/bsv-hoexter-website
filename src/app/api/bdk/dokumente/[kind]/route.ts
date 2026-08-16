import { createBdkDocumentService, safeBdkDownloadName } from "@/features/bdk/server/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ kind: string }> };

function berlinToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET(_request: Request, { params }: Context) {
  const { kind } = await params;
  const service = createBdkDocumentService();
  const document = await service.readPublic(kind, berlinToday());
  if (!document || (kind !== "invitation" && kind !== "delegate-key")) {
    return new Response("Nicht gefunden", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const filename = safeBdkDownloadName(kind, document);
  return new Response(new Uint8Array(document.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
