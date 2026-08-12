import { NextResponse } from "next/server";
import { authorizeEditorialRequest, EDITORIAL_LOGIN_RETRY_AFTER_SECONDS } from "@/lib/editorial-auth";
import { purgeRejectedEntries } from "@/lib/notice-board-moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") {
    return NextResponse.json(
      { error: authorization === "rate-limited" ? "Zu viele fehlgeschlagene Anmeldeversuche. Bitte später erneut versuchen." : "Redaktionszugang erforderlich." },
      { status: authorization === "rate-limited" ? 429 : 401, ...(authorization === "rate-limited" ? { headers: { "Retry-After": String(EDITORIAL_LOGIN_RETRY_AFTER_SECONDS) } } : {}) },
    );
  }
  return NextResponse.json(await purgeRejectedEntries(), { headers: { "Cache-Control": "no-store" } });
}