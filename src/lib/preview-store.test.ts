// @vitest-environment node
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appendPreviewRecord } from "@/lib/preview-store";

describe("appendPreviewRecord", () => {
  it("stores one JSON line without changing the supplied data", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-preview-"));
    await appendPreviewRecord(directory, "contact", { message: "Hallo BSV" });
    const saved = await readFile(path.join(directory, "contact.jsonl"), "utf8");
    const record = JSON.parse(saved.trim());
    expect(record.data).toEqual({ message: "Hallo BSV" });
    expect(record.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
