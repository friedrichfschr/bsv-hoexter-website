import { describe, expect, it } from "vitest";
import { checkPublicFormRateLimit, resetPublicFormRateLimits } from "@/shared/server/public-form-rate-limit";

describe("public form rate limiting", () => {
  it("limits repeated submissions for one trusted proxy client", () => {
    resetPublicFormRateLimits();
    const environment = { PUBLIC_FORMS_TRUSTED_PROXY: "true" };
    const request = new Request("http://localhost", { headers: { "x-forwarded-for": "192.0.2.42" } });
    for (let attempt = 0; attempt < 5; attempt += 1) expect(checkPublicFormRateLimit(request, "bdk", environment, 1_700_000_000_000)).toBe("allowed");
    expect(checkPublicFormRateLimit(request, "bdk", environment, 1_700_000_000_000)).toBe("rate-limited");
  });

  it("does not trust forwarded client addresses without explicit proxy configuration", () => {
    resetPublicFormRateLimits();
    const first = new Request("http://localhost", { headers: { "x-forwarded-for": "192.0.2.1" } });
    const second = new Request("http://localhost", { headers: { "x-forwarded-for": "192.0.2.2" } });
    for (let attempt = 0; attempt < 5; attempt += 1) expect(checkPublicFormRateLimit(first, "bdk", {}, 1_700_000_000_000)).toBe("allowed");
    expect(checkPublicFormRateLimit(second, "bdk", {}, 1_700_000_000_000)).toBe("rate-limited");
  });
});
