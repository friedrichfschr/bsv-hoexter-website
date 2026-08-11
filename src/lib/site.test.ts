import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "@/lib/site";

describe("resolveSiteUrl", () => {
  it("uses localhost for the local preview", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });

  it("normalizes a configured public URL", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://bsv.example.org/" })).toBe("https://bsv.example.org");
  });
});
