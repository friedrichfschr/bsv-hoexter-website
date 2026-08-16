import { describe, expect, it } from "vitest";
import { isPreviewFormEnabled, resolvePreviewDirectory } from "@/shared/server/preview-config";

describe("preview form configuration", () => {
  it("fails closed in production unless explicitly enabled", () => {
    expect(isPreviewFormEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(isPreviewFormEnabled({ NODE_ENV: "production", PREVIEW_FORMS_ENABLED: "true" })).toBe(true);
    expect(isPreviewFormEnabled({ NODE_ENV: "development" })).toBe(true);
  });

  it("supports an isolated storage directory", () => {
    expect(resolvePreviewDirectory({ PREVIEW_SUBMISSIONS_DIR: ".tmp/e2e" }, "C:/project")).toMatch(/project[\\/].tmp[\\/]e2e$/);
  });
});