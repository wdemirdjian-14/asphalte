import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 8 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

export class UploadError extends Error {}

/**
 * Enregistre une image dans /public/uploads et renvoie son URL publique.
 * En production, ce dossier doit être monté sur un volume persistant.
 */
export async function saveImage(file: File): Promise<string> {
  if (file.size === 0) throw new UploadError("Aucun fichier reçu.");
  if (file.size > MAX_BYTES) {
    throw new UploadError("Image trop lourde (8 Mo maximum).");
  }

  const extension = EXTENSIONS[file.type];
  if (!extension) {
    throw new UploadError("Format non supporté (JPEG, PNG, WebP ou AVIF).");
  }

  const filename = `${randomUUID()}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return `/uploads/${filename}`;
}
