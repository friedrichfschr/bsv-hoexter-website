import { NextResponse } from "next/server";
import { bdkEventMutationSchema, hasBdkEventPassed } from "@/features/bdk/domain/event";
import { berlinCalendarDate } from "@/features/bdk/domain/presentation";
import { createBdkDocumentService } from "@/features/bdk/server/documents";
import { BdkEventNotPassedError, createBdkRepository } from "@/features/bdk/server/repository";
import { authorizeEditorialRequest, EDITORIAL_LOGIN_RETRY_AFTER_SECONDS } from "@/shared/server/editorial-auth";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/shared/server/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized(result: "unauthorized" | "rate-limited") {
  return NextResponse.json({ error: result === "rate-limited" ? "Zu viele fehlgeschlagene Anmeldeversuche. Bitte später erneut versuchen." : "Redaktionszugang erforderlich." }, {
    status: result === "rate-limited" ? 429 : 401,
    ...(result === "rate-limited" ? { headers: { "Retry-After": String(EDITORIAL_LOGIN_RETRY_AFTER_SECONDS) } } : {}),
  });
}

async function stateResponse() {
  const state = await createBdkRepository().read();
  return NextResponse.json({ ...state, canPrepareNewEvent: hasBdkEventPassed(state.event, berlinCalendarDate()) }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") return unauthorized(authorization);
  return stateResponse();
}

export async function PUT(request: Request) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") return unauthorized(authorization);
  try {
    const body = await bufferRequestBody(request, 8_000);
    const parsed = bdkEventMutationSchema.safeParse(await body.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bitte die BDK-Angaben prüfen." }, { status: 400 });
    await createBdkRepository().updateEvent(parsed.data);
    return stateResponse();
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    return NextResponse.json({ error: "BDK konnte nicht gespeichert werden." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") return unauthorized(authorization);
  try {
    await createBdkDocumentService().prepareNewEvent();
    return stateResponse();
  } catch (error) {
    if (error instanceof BdkEventNotPassedError) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: "Neue BDK konnte nicht vorbereitet werden." }, { status: 400 });
  }
}
