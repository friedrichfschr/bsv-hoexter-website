import { NextResponse } from "next/server";
import { normalizeAboutEditorialContent, updateAboutContent } from "@/lib/about-content";
import { authorizeEditorialRequest, EDITORIAL_LOGIN_RETRY_AFTER_SECONDS } from "@/shared/server/editorial-auth";
import { readEditorialContent } from "@/lib/editorial";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/shared/server/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized(rateLimited = false) {
  return NextResponse.json({ error: rateLimited ? "Zu viele fehlgeschlagene Anmeldeversuche. Bitte später erneut versuchen." : "Redaktionszugang erforderlich." }, { status: rateLimited ? 429 : 401, ...(rateLimited ? { headers: { "Retry-After": String(EDITORIAL_LOGIN_RETRY_AFTER_SECONDS) } } : {}) });
}

export async function GET(request: Request) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") return unauthorized(authorization === "rate-limited");
  return NextResponse.json({ about: normalizeAboutEditorialContent((await readEditorialContent()).about) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") return unauthorized(authorization === "rate-limited");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Nicht unterstütztes Datenformat." }, { status: 415 });
  try {
    const bounded = await bufferRequestBody(request, 250_000);
    return NextResponse.json({ about: await updateAboutContent(undefined, await bounded.json()) });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Über-uns-Inhalte konnten nicht gespeichert werden." }, { status: 400 });
  }
}
