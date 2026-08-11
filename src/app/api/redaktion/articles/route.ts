import { NextResponse } from "next/server";
import { createArticle } from "@/lib/articles";
import { isEditorialRequestAuthorized } from "@/lib/editorial-auth";
import { readEditorialContent } from "@/lib/editorial";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/lib/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Redaktionszugang erforderlich." }, { status: 401 });
}

function badRequest(error: unknown) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Bitte alle redaktionellen Felder prüfen." }, { status: 400 });
}

export async function GET(request: Request) {
  if (!isEditorialRequestAuthorized(request)) return unauthorized();
  const content = await readEditorialContent();
  return NextResponse.json({ articles: content.articles }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isEditorialRequestAuthorized(request)) return unauthorized();
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Nicht unterstütztes Datenformat." }, { status: 415 });
  }
  try {
    const boundedRequest = await bufferRequestBody(request, 50_000);
    const article = await createArticle(undefined, await boundedRequest.json());
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Die Eingabe ist zu groß." }, { status: 413 });
    return badRequest(error);
  }
}
