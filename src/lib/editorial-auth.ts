import { createHmac, timingSafeEqual } from "node:crypto";

export const EDITORIAL_SESSION_COOKIE = "bsv_editorial_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;

type LoginFailure = { count: number; resetAt: number };
let loginFailure: LoginFailure | undefined;

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

function pruneLoginFailure(now: number) {
  if (loginFailure && loginFailure.resetAt <= now) loginFailure = undefined;
}

export function isEditorialLoginAllowed(now = Date.now()) {
  pruneLoginFailure(now);
  return (loginFailure?.count ?? 0) < LOGIN_MAX_FAILURES;
}

export function recordEditorialLoginFailure(now = Date.now()) {
  pruneLoginFailure(now);
  const current = loginFailure;
  if (!current) {
    loginFailure = { count: 1, resetAt: now + LOGIN_WINDOW_MS };
    return;
  }
  current.count += 1;
}

export function clearEditorialLoginFailures() {
  loginFailure = undefined;
}

export const EDITORIAL_LOGIN_RETRY_AFTER_SECONDS = Math.ceil(LOGIN_WINDOW_MS / 1000);

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
  if (authorization?.startsWith("Bearer ")) {
    if (isEditorialApiKeyValid(authorization.slice(7), environment)) {
      clearEditorialLoginFailures();
      return true;
    }
    if (isEditorialLoginAllowed()) recordEditorialLoginFailure();
    return false;
  }
  const authorized = isEditorialSessionAuthorized(editorialSessionFromCookie(request.headers.get("cookie")), environment);
  if (authorized) clearEditorialLoginFailures();
  return authorized;
}
