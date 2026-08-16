// @vitest-environment node
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { readValidatedJson, withSerializedMutation, writeJsonAtomically } from "@/shared/server/json-file-store";

const schema = z.object({ count: z.number().int().nonnegative() });

describe("JSON file store", () => {
  it("serializes full read-modify-write operations", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-json-store-"));
    const filePath = path.join(directory, "state.json");
    await writeJsonAtomically(filePath, { count: 0 });

    await Promise.all(Array.from({ length: 12 }, () => withSerializedMutation(filePath, async () => {
      const state = await readValidatedJson(filePath, schema, { count: 0 });
      await writeJsonAtomically(filePath, { count: state.count + 1 });
    })));

    expect(JSON.parse(await readFile(filePath, "utf8"))).toEqual({ count: 12 });
  });

  it("rejects malformed persisted data", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "bsv-json-invalid-"));
    const filePath = path.join(directory, "state.json");
    await writeFile(filePath, JSON.stringify({ count: -1 }), "utf8");

    await expect(readValidatedJson(filePath, schema, { count: 0 })).rejects.toThrow();
  });

  it("continues processing after a queued mutation rejects", async () => {
    const key = path.join(tmpdir(), `bsv-json-queue-${Date.now()}.json`);
    const failed = withSerializedMutation(key, async () => {
      throw new Error("expected failure");
    });
    const recovered = withSerializedMutation(key, async () => "completed");

    await expect(failed).rejects.toThrow("expected failure");
    await expect(recovered).resolves.toBe("completed");
  });
});
