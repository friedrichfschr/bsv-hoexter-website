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

  it("suppresses an identical duplicate record", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-preview-duplicate-"));
    const first = await appendPreviewRecord(directory, "bdk-signups", { email: "gleich@example.org" });
    const second = await appendPreviewRecord(directory, "bdk-signups", { email: "gleich@example.org" });
    expect(second.id).toBe(first.id);
    expect((await readFile(path.join(directory, "bdk-signups.jsonl"), "utf8")).trim().split("\n")).toHaveLength(1);
  });
});
