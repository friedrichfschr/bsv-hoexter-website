import { NextResponse } from "next/server";
import { isEditorialRequestAuthorized } from "@/lib/editorial-auth";
import { readEditorialContent, resolveEditorialDirectory, writeEditorialContent } from "@/lib/editorial";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/lib/request-body";

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
    const boundedRequest = await bufferRequestBody(request, 20_000_000);
    const content = await writeEditorialContent(resolveEditorialDirectory(), await boundedRequest.json());
    return NextResponse.json(content);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    }
    return NextResponse.json({ error: "Bitte alle redaktionellen Felder prüfen." }, { status: 400 });
  }
}
