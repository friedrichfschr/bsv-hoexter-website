import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
const queues = new Map<string, Promise<void>>();

async function enqueue<T>(file: string, operation: () => Promise<T>) {
  const previous = queues.get(file) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  queues.set(file, current);
  await previous;
  try { return await operation(); } finally {
    release();
    if (queues.get(file) === current) queues.delete(file);
  }
}

export async function appendPreviewRecord(directory: string, collection: string, data: unknown) {
  if (!/^[a-z-]+$/.test(collection)) throw new Error("Ungültiger Sammlungsname");
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, `${collection}.jsonl`);
  return enqueue(file, async () => {
    const size = await stat(file).then((value) => value.size).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return 0;
      throw error;
    });
    if (size >= 5_000_000) throw new Error("Das Vorschauformular hat sein Speicherlimit erreicht.");
    const existing = await readFile(file, "utf8").catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return "";
      throw error;
    });
    const duplicate = existing.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as { id: string; createdAt: string; data: unknown }).find((record) => JSON.stringify(record.data) === JSON.stringify(data));
    if (duplicate) return duplicate;
    const record = { id: randomUUID(), createdAt: new Date().toISOString(), data };
    await appendFile(file, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 });
    return record;
  });
}
