import { NextResponse } from "next/server";
import { authorizeEditorialRequest, EDITORIAL_LOGIN_RETRY_AFTER_SECONDS } from "@/shared/server/editorial-auth";
import { updatePosterEntry } from "@/features/notice-board/server/moderation";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/shared/server/request-body";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";

export async function PUT(request: Request, { params }: Context) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") {
    return NextResponse.json(
      { error: authorization === "rate-limited" ? "Zu viele fehlgeschlagene Anmeldeversuche. Bitte später erneut versuchen." : "Redaktionszugang erforderlich." },
      { status: authorization === "rate-limited" ? 429 : 401, ...(authorization === "rate-limited" ? { headers: { "Retry-After": String(EDITORIAL_LOGIN_RETRY_AFTER_SECONDS) } } : {}) },
    );
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Nicht unterstütztes Datenformat." }, { status: 415 });
  try {
    const { id } = await params;
    const bounded = await bufferRequestBody(request, 10_000);
    return NextResponse.json({ poster: await updatePosterEntry(undefined, id, await bounded.json()) });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Poster konnte nicht gespeichert werden." }, { status: 400 });
  }
}