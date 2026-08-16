import path from "node:path";
import { NextResponse } from "next/server";
import { authorizeEditorialRequest, EDITORIAL_LOGIN_RETRY_AFTER_SECONDS } from "@/shared/server/editorial-auth";
import { resolveEditorialDirectory } from "@/features/editorial/server/content-store";
import { readStoredUpload, removeStoredUpload, storeUpload } from "@/shared/server/uploads";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/shared/server/request-body";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") {
    return NextResponse.json(
      { error: authorization === "rate-limited" ? "Zu viele fehlgeschlagene Anmeldeversuche. Bitte später erneut versuchen." : "Redaktionszugang erforderlich." },
      { status: authorization === "rate-limited" ? 429 : 401, ...(authorization === "rate-limited" ? { headers: { "Retry-After": String(EDITORIAL_LOGIN_RETRY_AFTER_SECONDS) } } : {}) },
    );
  }
  try {
    const boundedRequest = await bufferRequestBody(request, 5_100_000);
    const form = await boundedRequest.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Bitte eine Datei auswählen." }, { status: 400 });
    const saved = await storeUpload(path.join(resolveEditorialDirectory(), "media"), file);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Datei konnte nicht gespeichert werden." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") {
    return NextResponse.json(
      { error: authorization === "rate-limited" ? "Zu viele fehlgeschlagene Anmeldeversuche. Bitte später erneut versuchen." : "Redaktionszugang erforderlich." },
      { status: authorization === "rate-limited" ? 429 : 401, ...(authorization === "rate-limited" ? { headers: { "Retry-After": String(EDITORIAL_LOGIN_RETRY_AFTER_SECONDS) } } : {}) },
    );
  }
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[a-z0-9-]{1,100}$/.test(id)) return NextResponse.json({ error: "Ungültige Datei-ID." }, { status: 400 });
  const directory = path.join(resolveEditorialDirectory(), "media");
  const upload = await readStoredUpload(directory, id);
  if (upload) await removeStoredUpload(directory, upload);
  return new Response(null, { status: 204 });
}
