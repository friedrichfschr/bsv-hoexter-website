import { timingSafeEqual } from "node:crypto";

export function isEditorialRequestAuthorized(request: Request, environment: Record<string, string | undefined> = process.env) {
  const configured = environment.EDITORIAL_API_KEY;
  const authorization = request.headers.get("authorization");
  if (!configured || !authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice(7);
  const expectedBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}
