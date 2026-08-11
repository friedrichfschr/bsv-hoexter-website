import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_UPLOAD_BYTES = 5_000_000;
const supported = {
  "image/png": { extension: "png", matches: (bytes: Uint8Array) => bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value) },
  "image/jpeg": { extension: "jpg", matches: (bytes: Uint8Array) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/webp": { extension: "webp", matches: (bytes: Uint8Array) => bytes.length >= 12 && text(bytes.slice(0, 4)) === "RIFF" && text(bytes.slice(8, 12)) === "WEBP" },
  "application/pdf": { extension: "pdf", matches: (bytes: Uint8Array) => bytes.length >= 5 && text(bytes.slice(0, 5)) === "%PDF-" },
} as const;

function text(bytes: Uint8Array) {
  return new TextDecoder("ascii").decode(bytes);
}

export type StoredUpload = {
  id: string;
  originalName: string;
  storedName: string;
  mediaType: keyof typeof supported;
  extension: string;
  size: number;
};

export async function validateUpload(file: File) {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Die Datei darf höchstens 5 MB groß sein.");
  const kind = supported[file.type as keyof typeof supported];
  if (!kind) throw new Error("Erlaubt sind nur PNG, JPEG, WebP oder PDF.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!kind.matches(bytes)) throw new Error("Der Dateiinhalt passt nicht zum angegebenen Dateityp.");
  return { bytes, extension: kind.extension, mediaType: file.type as keyof typeof supported };
}

export async function storeUpload(directory: string, file: File): Promise<StoredUpload> {
  const validated = await validateUpload(file);
  const id = randomUUID();
  const storedName = `${id}.${validated.extension}`;
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ directory, storedName), validated.bytes, { mode: 0o600 });
  const metadata: StoredUpload = {
    id,
    originalName: path.basename(file.name).slice(0, 180),
    storedName,
    mediaType: validated.mediaType,
    extension: validated.extension,
    size: file.size,
  };
  await writeFile(path.join(/* turbopackIgnore: true */ directory, `${id}.json`), JSON.stringify(metadata), { encoding: "utf8", mode: 0o600 });
  return metadata;
}

export async function readStoredUpload(directory: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return undefined;
  try {
    return JSON.parse(await readFile(path.join(/* turbopackIgnore: true */ directory, `${id}.json`), "utf8")) as StoredUpload;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
