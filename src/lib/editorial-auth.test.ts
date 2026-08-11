// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isEditorialRequestAuthorized } from "@/lib/editorial-auth";

describe("editorial API authorization", () => {
  it("uses a configured bearer secret and rejects missing configuration", () => {
    const request = new Request("http://localhost", { headers: { authorization: "Bearer redaktions-passwort" } });
    expect(isEditorialRequestAuthorized(request, { EDITORIAL_API_KEY: "redaktions-passwort" })).toBe(true);
    expect(isEditorialRequestAuthorized(request, {})).toBe(false);
    expect(isEditorialRequestAuthorized(new Request("http://localhost"), { EDITORIAL_API_KEY: "redaktions-passwort" })).toBe(false);
  });
});
