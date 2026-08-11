import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "@/lib/site";

describe("resolveSiteUrl", () => {
  it("uses localhost for the local preview", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });

  it("normalizes a configured public URL", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://bsv.example.org/" })).toBe("https://bsv.example.org");
  });

  it("falls back to the deploy URL when the configured value is invalid", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "****", DEPLOY_PRIME_URL: "https://deploy-preview.example.net" })).toBe("https://deploy-preview.example.net");
  });

  it("uses the Netlify URL before the local fallback", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "not-a-url", URL: "https://bsv.example.net/" })).toBe("https://bsv.example.net");
  });
});
