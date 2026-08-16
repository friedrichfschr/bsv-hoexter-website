// @vitest-environment node
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readStoredUpload, storeUpload, validateUpload } from "@/shared/server/uploads";

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

  it("rejects tampered metadata before using a stored filename", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-upload-metadata-"));
    const id = "123e4567-e89b-12d3-a456-426614174000";
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, `${id}.json`), JSON.stringify({
      id,
      originalName: "image.png",
      storedName: "../outside.png",
      mediaType: "image/png",
      extension: "png",
      size: pngBytes.length,
    }));

    await expect(readStoredUpload(directory, id)).resolves.toBeUndefined();

    await writeFile(path.join(directory, `${id}.json`), JSON.stringify({
      id,
      originalName: "image.png",
      storedName: `${id}.`,
      mediaType: "__proto__",
      extension: "",
      size: pngBytes.length,
    }));
    await expect(readStoredUpload(directory, id)).resolves.toBeUndefined();
  });
});
