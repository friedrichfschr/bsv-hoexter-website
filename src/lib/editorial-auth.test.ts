// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createEditorialSessionToken, isEditorialRequestAuthorized, isEditorialSessionAuthorized } from "@/lib/editorial-auth";

describe("editorial API authorization", () => {
  it("uses a configured bearer secret and rejects missing configuration", () => {
    const request = new Request("http://localhost", { headers: { authorization: "Bearer redaktions-passwort" } });
    expect(isEditorialRequestAuthorized(request, { EDITORIAL_API_KEY: "redaktions-passwort" })).toBe(true);
    expect(isEditorialRequestAuthorized(request, {})).toBe(false);
    expect(isEditorialRequestAuthorized(new Request("http://localhost"), { EDITORIAL_API_KEY: "redaktions-passwort" })).toBe(false);
  });

  it("accepts a signed session cookie without exposing the API key", () => {
    const environment = { EDITORIAL_API_KEY: "redaktions-passwort" };
    const token = createEditorialSessionToken(environment, 60_000);
    const request = new Request("http://localhost", { headers: { cookie: `bsv_editorial_session=${token}` } });

    expect(isEditorialRequestAuthorized(request, environment)).toBe(true);
    expect(isEditorialSessionAuthorized(token, environment)).toBe(true);
    expect(token).not.toContain("redaktions-passwort");
  });

  it("rejects a tampered or expired session cookie", () => {
    const environment = { EDITORIAL_API_KEY: "redaktions-passwort" };
    const expired = createEditorialSessionToken(environment, -1);
    const tampered = `${expired.slice(0, -1)}x`;

    expect(isEditorialSessionAuthorized(expired, environment)).toBe(false);
    expect(isEditorialSessionAuthorized(tampered, environment)).toBe(false);
  });
});
