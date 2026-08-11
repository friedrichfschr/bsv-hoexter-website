// @vitest-environment node
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { storeUpload, validateUpload } from "@/lib/uploads";

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function upload(name = "flyer.png", type = "image/png", bytes: Uint8Array = pngBytes) {
  return new File([Uint8Array.from(bytes)], name, { type });
}

describe("validated uploads", () => {
  it("accepts an image only when its signature matches its declared type", async () => {
    await expect(validateUpload(upload())).resolves.toMatchObject({ extension: "png", mediaType: "image/png" });
    await expect(validateUpload(upload("flyer.png", "image/png", new Uint8Array([1, 2, 3])))).rejects.toThrow(/Dateiinhalt/);
  });

  it("rejects executable and oversized files", async () => {
    await expect(validateUpload(new File(["alert(1)"], "flyer.js", { type: "text/javascript" }))).rejects.toThrow(/PNG, JPEG, WebP oder PDF/);
    await expect(validateUpload(new File([new Uint8Array(5_000_001)], "huge.png", { type: "image/png" }))).rejects.toThrow(/5 MB/);
  });

  it("stores a validated upload under an opaque generated name", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-upload-"));
    const saved = await storeUpload(directory, upload("mein flyer.png"));
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved.storedName).toBe(`${saved.id}.png`);
    expect(new Uint8Array(await readFile(path.join(directory, saved.storedName)))).toEqual(pngBytes);
  });
});
