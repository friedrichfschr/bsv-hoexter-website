import { NextResponse } from "next/server";
import { createBdkDocumentService } from "@/features/bdk/server/documents";
import { authorizeEditorialRequest, EDITORIAL_LOGIN_RETRY_AFTER_SECONDS } from "@/shared/server/editorial-auth";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/shared/server/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized(result: "unauthorized" | "rate-limited") {
  return NextResponse.json(
    { error: result === "rate-limited" ? "Zu viele fehlgeschlagene Anmeldeversuche. Bitte später erneut versuchen." : "Redaktionszugang erforderlich." },
    { status: result === "rate-limited" ? 429 : 401, ...(result === "rate-limited" ? { headers: { "Retry-After": String(EDITORIAL_LOGIN_RETRY_AFTER_SECONDS) } } : {}) },
  );
}

export async function POST(request: Request) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") return unauthorized(authorization);
  try {
    const bounded = await bufferRequestBody(request, 5_100_000);
    const form = await bounded.formData();
    const kind = form.get("kind");
    const file = form.get("file");
    if (typeof kind !== "string" || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Bitte Dokumentart und PDF-Datei angeben." }, { status: 400 });
    }
    const upload = await createBdkDocumentService().upload(kind, file);
    return NextResponse.json(upload, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Datei konnte nicht gespeichert werden." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") return unauthorized(authorization);
  const kind = new URL(request.url).searchParams.get("kind") ?? "";
  try {
    await createBdkDocumentService().remove(kind);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Dokument konnte nicht entfernt werden." }, { status: 400 });
  }
}
