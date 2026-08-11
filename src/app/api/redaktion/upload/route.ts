import path from "node:path";
import { NextResponse } from "next/server";
import { isEditorialRequestAuthorized } from "@/lib/editorial-auth";
import { resolveEditorialDirectory } from "@/lib/editorial";
import { storeUpload } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isEditorialRequestAuthorized(request)) return NextResponse.json({ error: "Redaktionszugang erforderlich." }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Bitte eine Datei auswählen." }, { status: 400 });
    const saved = await storeUpload(path.join(resolveEditorialDirectory(), "media"), file);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Datei konnte nicht gespeichert werden." }, { status: 400 });
  }
}
