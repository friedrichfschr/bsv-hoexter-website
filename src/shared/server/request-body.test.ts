// @vitest-environment node
import { describe, expect, it } from "vitest";
import { bufferRequestBody, RequestBodyTooLargeError } from "@/shared/server/request-body";

describe("bufferRequestBody", () => {
  it("rebuilds a request whose body stays within the limit", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "test" }),
    });

    const bounded = await bufferRequestBody(request, 1_000);

    await expect(bounded.json()).resolves.toEqual({ value: "test" });
  });

  it("rejects streamed bodies that exceed the limit without a content-length header", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("12345"));
        controller.enqueue(encoder.encode("67890"));
        controller.close();
      },
    });
    const request = new Request("https://example.test/api", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(bufferRequestBody(request, 8)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("rejects an advertised body size before consuming the stream", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      headers: { "content-length": "100" },
      body: "test",
    });

    await expect(bufferRequestBody(request, 10)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("preserves the size error when cancelling an oversized stream fails", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(10));
      },
      cancel() {
        return Promise.reject(new Error("Test cancellation failure"));
      },
    });
    const request = new Request("https://example.test/api", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(bufferRequestBody(request, 8)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("preserves multipart metadata for subsequent form parsing", async () => {
    const form = new FormData();
    form.set("title", "Test event");
    const request = new Request("https://example.test/api", { method: "POST", body: form });

    const bounded = await bufferRequestBody(request, 10_000);

    const parsed = await bounded.formData();
    expect(parsed.get("title")).toBe("Test event");
  });
});
