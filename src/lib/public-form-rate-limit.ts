const WINDOW_MS = 15 * 60 * 1000;
const MAX_SUBMISSIONS = 5;

type Environment = Record<string, string | undefined>;
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function prune(now: number) {
  for (const [client, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(client);
}

function clientIdentifier(request: Request, environment: Environment) {
  if (environment.PUBLIC_FORMS_TRUSTED_PROXY === "true") {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return `proxy:${forwarded}`;
    const real = request.headers.get("x-real-ip")?.trim();
    if (real) return `proxy:${real}`;
  }
  return "local-process";
}

export function checkPublicFormRateLimit(request: Request, scope: string, environment: Environment = process.env, now = Date.now()) {
  prune(now);
  const client = `${scope}:${clientIdentifier(request, environment)}`;
  const bucket = buckets.get(client);
  if (!bucket) {
    buckets.set(client, { count: 1, resetAt: now + WINDOW_MS });
    return "allowed" as const;
  }
  if (bucket.count >= MAX_SUBMISSIONS) return "rate-limited" as const;
  bucket.count += 1;
  return "allowed" as const;
}

export function resetPublicFormRateLimits() {
  buckets.clear();
}

export const PUBLIC_FORM_RETRY_AFTER_SECONDS = Math.ceil(WINDOW_MS / 1000);
