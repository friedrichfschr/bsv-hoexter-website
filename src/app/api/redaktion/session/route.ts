import { NextResponse } from "next/server";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/shared/server/request-body";
import {
  clearEditorialLoginFailures,
  createEditorialSessionToken,
  EDITORIAL_LOGIN_RETRY_AFTER_SECONDS,
  EDITORIAL_SESSION_COOKIE,
  editorialLoginClientIdentifier,
  isEditorialLoginAllowed,
  isEditorialApiKeyValid,
  recordEditorialLoginFailure,
} from "@/shared/server/editorial-auth";

export const runtime = "nodejs";

const SESSION_MAX_AGE = 8 * 60 * 60;

export async function POST(request: Request) {
  const client = editorialLoginClientIdentifier(request);
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Nicht unterstütztes Datenformat." }, { status: 415 });
  }
  try {
    const boundedRequest = await bufferRequestBody(request, 2_000);
    const body = await boundedRequest.json() as { key?: unknown };
    if (typeof body.key !== "string" || !isEditorialApiKeyValid(body.key)) {
      if (!isEditorialLoginAllowed(client)) {
        return NextResponse.json(
          { error: "Zu viele fehlgeschlagene Anmeldeversuche. Bitte später erneut versuchen." },
          { status: 429, headers: { "Retry-After": String(EDITORIAL_LOGIN_RETRY_AFTER_SECONDS) } },
        );
      }
      recordEditorialLoginFailure(client);
      return NextResponse.json({ error: "Anmeldung fehlgeschlagen." }, { status: 401 });
    }
    clearEditorialLoginFailures(client);
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set({
      name: EDITORIAL_SESSION_COOKIE,
      value: createEditorialSessionToken(),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    return NextResponse.json({ error: "Anmeldung fehlgeschlagen." }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set({ name: EDITORIAL_SESSION_COOKIE, value: "", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
