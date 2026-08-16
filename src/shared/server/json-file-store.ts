import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ZodType } from "zod";

const mutationQueues = new Map<string, Promise<void>>();

export async function withSerializedMutation<T>(key: string, operation: () => Promise<T>) {
  const previous = mutationQueues.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  mutationQueues.set(key, current);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (mutationQueues.get(key) === current) mutationQueues.delete(key);
  }
}

export async function readValidatedJson<T>(filePath: string, schema: ZodType<T>, empty: T): Promise<T> {
  try {
    return schema.parse(JSON.parse(await readFile(filePath, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(empty);
    throw error;
  }
}

export async function writeJsonAtomically(filePath: string, value: unknown) {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`);
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, filePath);
}
