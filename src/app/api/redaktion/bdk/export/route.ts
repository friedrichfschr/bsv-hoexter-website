import { NextResponse } from "next/server";
import { berlinCalendarDate } from "@/features/bdk/domain/presentation";
import { generateBdkWorkbook } from "@/features/bdk/server/export";
import { createBdkRepository } from "@/features/bdk/server/repository";
import { authorizeEditorialRequest, EDITORIAL_LOGIN_RETRY_AFTER_SECONDS } from "@/shared/server/editorial-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = authorizeEditorialRequest(request);
  if (authorization !== "authorized") {
    return NextResponse.json({ error: authorization === "rate-limited" ? "Zu viele fehlgeschlagene Anmeldeversuche. Bitte später erneut versuchen." : "Redaktionszugang erforderlich." }, {
      status: authorization === "rate-limited" ? 429 : 401,
      ...(authorization === "rate-limited" ? { headers: { "Retry-After": String(EDITORIAL_LOGIN_RETRY_AFTER_SECONDS) } } : {}),
    });
  }
  const state = await createBdkRepository().read();
  const workbook = await generateBdkWorkbook(state.signups);
  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bdk-anmeldungen-${berlinCalendarDate()}.xlsx"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
