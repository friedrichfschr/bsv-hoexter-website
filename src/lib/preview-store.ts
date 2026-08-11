import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export async function appendPreviewRecord(directory: string, collection: string, data: unknown) {
  if (!/^[a-z-]+$/.test(collection)) throw new Error("Ungültiger Sammlungsname");
  await mkdir(directory, { recursive: true });
  const record = { id: randomUUID(), createdAt: new Date().toISOString(), data };
  await appendFile(path.join(directory, `${collection}.jsonl`), `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 });
  return record;
}
