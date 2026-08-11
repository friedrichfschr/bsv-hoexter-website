import { createHmac, timingSafeEqual } from "node:crypto";

export const EDITORIAL_SESSION_COOKIE = "bsv_editorial_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

type EditorialEnvironment = Record<string, string | undefined>;

function configuredSecret(environment: EditorialEnvironment) {
  return environment.EDITORIAL_API_KEY;
}

function safeEqual(supplied: string, expected: string) {
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function isEditorialApiKeyValid(supplied: string, environment: EditorialEnvironment = process.env) {
  const configured = configuredSecret(environment);
  return Boolean(configured && safeEqual(supplied, configured));
}

export function createEditorialSessionToken(environment: EditorialEnvironment = process.env, ttlMs = SESSION_TTL_MS, now = Date.now()) {
  const secret = configuredSecret(environment);
  if (!secret) throw new Error("EDITORIAL_API_KEY ist nicht konfiguriert.");
  const payload = Buffer.from(JSON.stringify({ expiresAt: now + ttlMs })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function isEditorialSessionAuthorized(token: string | undefined, environment: EditorialEnvironment = process.env, now = Date.now()) {
  const secret = configuredSecret(environment);
  if (!token || !secret) return false;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature || !safeEqual(suppliedSignature, sign(payload, secret))) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { expiresAt?: unknown };
    return typeof parsed.expiresAt === "number" && parsed.expiresAt > now;
  } catch {
    return false;
  }
}

function editorialSessionFromCookie(header: string | null) {
  const value = header?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${EDITORIAL_SESSION_COOKIE}=`));
  return value?.slice(EDITORIAL_SESSION_COOKIE.length + 1);
}

export function isEditorialRequestAuthorized(request: Request, environment: EditorialEnvironment = process.env) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ") && isEditorialApiKeyValid(authorization.slice(7), environment)) return true;
  return isEditorialSessionAuthorized(editorialSessionFromCookie(request.headers.get("cookie")), environment);
}
