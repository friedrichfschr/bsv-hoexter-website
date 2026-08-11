import { NextResponse } from "next/server";
import { isEditorialRequestAuthorized } from "@/lib/editorial-auth";
import { readEditorialContent, resolveEditorialDirectory, writeEditorialContent } from "@/lib/editorial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Redaktionszugang erforderlich." }, { status: 401 });
}

export async function GET(request: Request) {
  if (!isEditorialRequestAuthorized(request)) return unauthorized();
  try {
    return NextResponse.json(await readEditorialContent());
  } catch {
    return NextResponse.json({ error: "Redaktionsinhalte konnten nicht gelesen werden." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isEditorialRequestAuthorized(request)) return unauthorized();
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Nicht unterstütztes Datenformat." }, { status: 415 });
  }
  try {
    const content = await writeEditorialContent(resolveEditorialDirectory(), await request.json());
    return NextResponse.json(content);
  } catch {
    return NextResponse.json({ error: "Bitte alle redaktionellen Felder prüfen." }, { status: 400 });
  }
}
