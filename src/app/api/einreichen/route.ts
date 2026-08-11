import { NextResponse } from "next/server";
import { validateSubmission } from "@/lib/submission";
import { appendPreviewRecord } from "@/lib/preview-store";
import { isPreviewFormEnabled, resolvePreviewDirectory } from "@/lib/preview-config";
import path from "node:path";
import { storeUpload } from "@/lib/uploads";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/lib/request-body";

export async function POST(request: Request) {
  if (!isPreviewFormEnabled(process.env)) {
    return NextResponse.json({ error: "Das Vorschauformular ist in dieser Umgebung deaktiviert." }, { status: 503 });
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("application/json") && !contentType.startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "Nicht unterstütztes Datenformat." }, { status: 415 });
  }
  try {
    const boundedRequest = await bufferRequestBody(request, contentType.startsWith("multipart/form-data") ? 5_100_000 : 20_000);
    let body: unknown;
    let flyerFile: File | undefined;
    if (contentType.startsWith("multipart/form-data")) {
      const form = await boundedRequest.formData();
      const candidate = form.get("flyerFile");
      flyerFile = candidate instanceof File && candidate.size > 0 ? candidate : undefined;
      body = Object.fromEntries([...form.entries()].filter(([key]) => key !== "flyerFile"));
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
    const directory = resolvePreviewDirectory(process.env);
    let flyerUpload;
    if (flyerFile) {
      try {
        flyerUpload = await storeUpload(path.join(directory, "board-uploads"), flyerFile);
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Der Flyer konnte nicht gespeichert werden.", field: "flyerFile" }, { status: 400 });
      }
    }
    const record = await appendPreviewRecord(directory, "events", { ...parsed.data, flyerUpload });
    return NextResponse.json({ id: record.id }, { status: 202 });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    }
    return NextResponse.json({ error: "Der Vorschlag konnte nicht verarbeitet werden." }, { status: 400 });
  }
}
