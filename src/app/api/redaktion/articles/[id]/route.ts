import { NextResponse } from "next/server";
import { authorizeEditorialRequest, EDITORIAL_LOGIN_RETRY_AFTER_SECONDS } from "@/lib/editorial-auth";
import { updateArticle } from "@/lib/articles";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/lib/request-body";

type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

function unauthorized(rateLimited = false) {
  return NextResponse.json(
    { error: rateLimited ? "Zu viele fehlgeschlagene Anmeldeversuche. Bitte später erneut versuchen." : "Redaktionszugang erforderlich." },
    { status: rateLimited ? 429 : 401, ...(rateLimited ? { headers: { "Retry-After": String(EDITORIAL_LOGIN_RETRY_AFTER_SECONDS) } } : {}) },
  );
}

export async function PUT(request: Request, { params }: Context) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") return unauthorized(authorization === "rate-limited");
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Nicht unterstütztes Datenformat." }, { status: 415 });
  }
  try {
    const { id } = await params;
    const boundedRequest = await bufferRequestBody(request, 50_000);
    const article = await updateArticle(undefined, id, await boundedRequest.json());
    return NextResponse.json({ article });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bitte alle redaktionellen Felder prüfen." }, { status: 400 });
  }
}
