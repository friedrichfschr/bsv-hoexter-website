export function resolveSiteUrl(environment: Record<string, string | undefined>) {
  const candidates = [
    environment.NEXT_PUBLIC_SITE_URL,
    environment.DEPLOY_PRIME_URL,
    environment.URL,
    "http://localhost:3000",
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      return url.toString().replace(/\/$/, "");
    } catch {
      // Continue with the deploy-provided or local fallback URL.
    }
  }

  return "http://localhost:3000";
}

export const siteUrl = resolveSiteUrl(process.env);
