import { NextResponse } from "next/server";
import { validateBdkSignup } from "@/features/bdk/domain/signup";
import { BdkSignupUnavailableError, createBdkRepository, DuplicateBdkSignupError } from "@/features/bdk/server/repository";
import { isPreviewFormEnabled } from "@/shared/server/preview-config";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/shared/server/request-body";
import { checkPublicFormRateLimit, PUBLIC_FORM_RETRY_AFTER_SECONDS } from "@/shared/server/public-form-rate-limit";

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
    const record = await createBdkRepository().createSignup(parsed.data);
    return NextResponse.json({ id: record.id }, { status: 202 });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    }
    if (error instanceof DuplicateBdkSignupError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof BdkSignupUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Die Anmeldung konnte nicht verarbeitet werden." }, { status: 400 });
  }
}
