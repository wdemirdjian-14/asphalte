import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Les fichiers restent dans public/uploads : c'est le volume déjà monté en
 * production. Ils ne sont pas servis par le service statique de Next mais
 * par la route /uploads/[...file] — voir le commentaire de cette route.
 */
export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/** Sous-dossier des pièces jointes réservées aux personnes connectées. */
export const DOCUMENTS_PREFIX = "docs";

const MAX_BYTES = 12 * 1024 * 1024;

/** Formats affichables directement dans une balise <img>. */
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
  // Photos prises depuis un iPhone récent, quand Safari ne convertit pas
  "image/heic": ".heic",
  "image/heif": ".heif",
};

/** Formats acceptés pour un document (carte grise scannée, facture…). */
const DOCUMENT_TYPES: Record<string, string> = {
  ...IMAGE_TYPES,
  "application/pdf": ".pdf",
};

export class UploadError extends Error {}

async function save(
  file: File,
  allowed: Record<string, string>,
  label: string,
  prefix?: string,
): Promise<string> {
  if (file.size === 0) throw new UploadError("Aucun fichier reçu.");
  if (file.size > MAX_BYTES) {
    throw new UploadError("Fichier trop lourd (12 Mo maximum).");
  }

  const extension = allowed[file.type];
  if (!extension) {
    throw new UploadError(`Format non supporté pour ${label} (${file.type || "type inconnu"}).`);
  }

  const filename = `${randomUUID()}${extension}`;
  const directory = prefix ? path.join(UPLOAD_DIR, prefix) : UPLOAD_DIR;
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), buffer);

  return prefix ? `/uploads/${prefix}/${filename}` : `/uploads/${filename}`;
}

/**
 * Enregistre une image dans /public/uploads et renvoie son URL publique.
 * En production, ce dossier doit être monté sur un volume persistant.
 */
export async function saveImage(file: File): Promise<string> {
  return save(file, IMAGE_TYPES, "une photo");
}

/**
 * Comme saveImage, mais accepte aussi un PDF (carte grise scannée) et range
 * le fichier dans le sous-dossier protégé : une carte grise porte le nom,
 * l'adresse et l'immatriculation du client.
 */
export async function saveDocument(file: File): Promise<string> {
  return save(file, DOCUMENT_TYPES, "un document", DOCUMENTS_PREFIX);
}

/** Un PDF ne s'affiche pas dans une balise <img> : il faut une vignette. */
export function isPdf(url: string): boolean {
  return url.toLowerCase().endsWith(".pdf");
}
