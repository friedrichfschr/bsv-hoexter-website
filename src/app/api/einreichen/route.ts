import { NextResponse } from "next/server";
import { submissionRequiresPoster, validateSubmission } from "@/features/notice-board/domain/submission";
import path from "node:path";
import { createNoticeBoardSubmission, resolveNoticeBoardDirectory } from "@/features/notice-board/server/moderation";
import { isPreviewFormEnabled } from "@/lib/preview-config";
import { storeUpload } from "@/lib/uploads";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { checkPublicFormRateLimit, PUBLIC_FORM_RETRY_AFTER_SECONDS } from "@/lib/public-form-rate-limit";

export async function POST(request: Request) {
  if (!isPreviewFormEnabled(process.env)) {
    return NextResponse.json({ error: "Das Vorschauformular ist in dieser Umgebung deaktiviert." }, { status: 503 });
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("application/json") && !contentType.startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "Nicht unterstütztes Datenformat." }, { status: 415 });
  }
  if (checkPublicFormRateLimit(request, "notice-board-submission") === "rate-limited") {
    return NextResponse.json({ error: "Zu viele Einreichungen. Bitte später erneut versuchen." }, { status: 429, headers: { "Retry-After": String(PUBLIC_FORM_RETRY_AFTER_SECONDS) } });
  }
  try {
    const boundedRequest = await bufferRequestBody(request, contentType.startsWith("multipart/form-data") ? 5_100_000 : 20_000);
    let body: unknown;
    let posterFile: File | undefined;
    if (contentType.startsWith("multipart/form-data")) {
      const form = await boundedRequest.formData();
      const candidate = form.get("posterFile");
      posterFile = candidate instanceof File && candidate.size > 0 ? candidate : undefined;
      body = Object.fromEntries([...form.entries()].filter(([key]) => key !== "posterFile"));
      (body as Record<string, unknown>).consent = form.get("consent") === "true";
    } else {
      body = await boundedRequest.json();
    }
    if (JSON.stringify(body).length > 20_000) return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    const parsed = validateSubmission(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ error: issue?.message ?? "Bitte die Angaben prüfen.", field: issue?.path[0] }, { status: 400 });
    }
    if (submissionRequiresPoster(parsed.data.submissionKind) && !posterFile) {
      return NextResponse.json({ error: "Bitte eine Posterdatei auswählen.", field: "posterFile" }, { status: 400 });
    }
    if (posterFile && !posterFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "Poster müssen als PNG, JPEG oder WebP eingereicht werden.", field: "posterFile" }, { status: 400 });
    }
    const directory = resolveNoticeBoardDirectory();
    let posterUpload;
    if (posterFile && submissionRequiresPoster(parsed.data.submissionKind)) {
      try {
        posterUpload = await storeUpload(path.join(directory, "board-media"), posterFile);
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Das Poster konnte nicht gespeichert werden.", field: "posterFile" }, { status: 400 });
      }
    }
    const record = await createNoticeBoardSubmission(directory, parsed.data, posterUpload);
    return NextResponse.json({ eventId: record.event?.id, posterId: record.poster?.id }, { status: 202 });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    }
    return NextResponse.json({ error: "Der Vorschlag konnte nicht verarbeitet werden." }, { status: 400 });
  }
}
