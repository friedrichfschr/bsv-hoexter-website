export function resolveSiteUrl(environment: Record<string, string | undefined>) {
  return (environment.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export const siteUrl = resolveSiteUrl(process.env);
