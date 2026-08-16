import { NextResponse } from "next/server";
import { hasBdkEventPassed } from "@/features/bdk/domain/event";
import { berlinCalendarDate } from "@/features/bdk/domain/presentation";
import { bdkSignupStatusSchema } from "@/features/bdk/domain/state";
import { BdkRecordNotFoundError, createBdkRepository } from "@/features/bdk/server/repository";
import { authorizeEditorialRequest, EDITORIAL_LOGIN_RETRY_AFTER_SECONDS } from "@/shared/server/editorial-auth";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/shared/server/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

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

export async function PATCH(request: Request, { params }: Context) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") return unauthorized(authorization);
  const { id } = await params;
  try {
    const body = await bufferRequestBody(request, 1_000);
    const parsed = bdkSignupStatusSchema.safeParse((await body.json() as { status?: unknown }).status);
    if (!parsed.success) return NextResponse.json({ error: "Ungültiger Anmeldestatus." }, { status: 400 });
    await createBdkRepository().setSignupStatus(id, parsed.data);
    return stateResponse();
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    if (error instanceof BdkRecordNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ error: "Anmeldung konnte nicht geändert werden." }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") return unauthorized(authorization);
  const { id } = await params;
  try {
    await createBdkRepository().deleteSignup(id);
    return stateResponse();
  } catch (error) {
    if (error instanceof BdkRecordNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ error: "Anmeldung konnte nicht gelöscht werden." }, { status: 400 });
  }
}
