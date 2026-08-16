import { NextResponse } from "next/server";
import { replaceEditorialContent } from "@/features/editorial/server/content-service";
import { authorizeEditorialRequest, EDITORIAL_LOGIN_RETRY_AFTER_SECONDS } from "@/shared/server/editorial-auth";
import { readEditorialContent } from "@/features/editorial/server/content-store";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/shared/server/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized(rateLimited = false) {
  return NextResponse.json(
    { error: rateLimited ? "Zu viele fehlgeschlagene Anmeldeversuche. Bitte später erneut versuchen." : "Redaktionszugang erforderlich." },
    { status: rateLimited ? 429 : 401, ...(rateLimited ? { headers: { "Retry-After": String(EDITORIAL_LOGIN_RETRY_AFTER_SECONDS) } } : {}) },
  );
}

export async function GET(request: Request) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") return unauthorized(authorization === "rate-limited");
  try {
    return NextResponse.json(await readEditorialContent());
  } catch {
    return NextResponse.json({ error: "Redaktionsinhalte konnten nicht gelesen werden." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") return unauthorized(authorization === "rate-limited");
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Nicht unterstütztes Datenformat." }, { status: 415 });
  }
  try {
    const boundedRequest = await bufferRequestBody(request, 20_000_000);
    const content = await replaceEditorialContent(undefined, await boundedRequest.json());
    return NextResponse.json(content);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    }
    return NextResponse.json({ error: "Bitte alle redaktionellen Felder prüfen." }, { status: 400 });
  }
}
