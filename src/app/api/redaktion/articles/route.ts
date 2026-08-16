import { NextResponse } from "next/server";
import { createArticle } from "@/lib/articles";
import { authorizeEditorialRequest, EDITORIAL_LOGIN_RETRY_AFTER_SECONDS } from "@/shared/server/editorial-auth";
import { readEditorialContent } from "@/lib/editorial";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/shared/server/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized(rateLimited = false) {
  return NextResponse.json(
    { error: rateLimited ? "Zu viele fehlgeschlagene Anmeldeversuche. Bitte später erneut versuchen." : "Redaktionszugang erforderlich." },
    { status: rateLimited ? 429 : 401, ...(rateLimited ? { headers: { "Retry-After": String(EDITORIAL_LOGIN_RETRY_AFTER_SECONDS) } } : {}) },
  );
}

function badRequest(error: unknown) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Bitte alle redaktionellen Felder prüfen." }, { status: 400 });
}

export async function GET(request: Request) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") return unauthorized(authorization === "rate-limited");
  const content = await readEditorialContent();
  return NextResponse.json({ articles: content.articles }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") return unauthorized(authorization === "rate-limited");
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Nicht unterstütztes Datenformat." }, { status: 415 });
  }
  try {
    const boundedRequest = await bufferRequestBody(request, 50_000);
    const article = await createArticle(undefined, await boundedRequest.json());
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    return badRequest(error);
  }
}
