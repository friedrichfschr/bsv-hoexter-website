import { NextResponse } from "next/server";
import { validateContact } from "@/lib/contact";
import { appendPreviewRecord } from "@/lib/preview-store";
import { isPreviewFormEnabled, resolvePreviewDirectory } from "@/lib/preview-config";

export async function POST(request: Request) {
  if (!isPreviewFormEnabled(process.env)) {
    return NextResponse.json({ error: "Das Vorschauformular ist in dieser Umgebung deaktiviert." }, { status: 503 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Nicht unterstütztes Datenformat." }, { status: 415 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 20_000) {
    return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
  }
  try {
    const body: unknown = await request.json();
    if (JSON.stringify(body).length > 20_000) return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    const parsed = validateContact(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bitte die Angaben prüfen." }, { status: 400 });
    }
    const directory = resolvePreviewDirectory(process.env);
    const record = await appendPreviewRecord(directory, "contact", parsed.data);
    return NextResponse.json({ id: record.id }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Die Nachricht konnte nicht verarbeitet werden." }, { status: 400 });
  }
}
