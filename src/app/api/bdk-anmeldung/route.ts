import { NextResponse } from "next/server";
import { validateBdkSignup } from "@/lib/bdk-signup";
import { isPreviewFormEnabled, resolvePreviewDirectory } from "@/lib/preview-config";
import { appendPreviewRecord } from "@/lib/preview-store";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { checkPublicFormRateLimit, PUBLIC_FORM_RETRY_AFTER_SECONDS } from "@/lib/public-form-rate-limit";

export async function POST(request: Request) {
  if (!isPreviewFormEnabled(process.env)) {
    return NextResponse.json({ error: "Die Anmeldung ist in dieser Umgebung noch nicht aktiviert." }, { status: 503 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Nicht unterstütztes Datenformat." }, { status: 415 });
  }
  if (checkPublicFormRateLimit(request, "bdk-signup") === "rate-limited") {
    return NextResponse.json({ error: "Zu viele Anmeldungen. Bitte später erneut versuchen." }, { status: 429, headers: { "Retry-After": String(PUBLIC_FORM_RETRY_AFTER_SECONDS) } });
  }

  try {
    const boundedRequest = await bufferRequestBody(request, 12_000);
    const body: unknown = await boundedRequest.json();
    const parsed = validateBdkSignup(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bitte die Angaben prüfen." }, { status: 400 });
    }
    const record = await appendPreviewRecord(resolvePreviewDirectory(process.env), "bdk-signups", parsed.data);
    return NextResponse.json({ id: record.id }, { status: 202 });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    }
    return NextResponse.json({ error: "Die Anmeldung konnte nicht verarbeitet werden." }, { status: 400 });
  }
}
