import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

export { isPdf, thumbUrl } from "@/lib/files";

/**
 * Les fichiers restent dans public/uploads : c'est le volume déjà monté en
 * production. Ils ne sont pas servis par le service statique de Next mais
 * par la route /uploads/[...file] — voir le commentaire de cette route.
 */
export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/** Sous-dossier des pièces jointes réservées aux personnes connectées. */
export const DOCUMENTS_PREFIX = "docs";

const MAX_BYTES = 25 * 1024 * 1024;

/** Côté le plus long de l'image conservée. Au-delà, rien de visible en plus. */
const MAX_EDGE = 1800;
/** Côté le plus long de la vignette servie dans les listes. */
const THUMB_EDGE = 400;

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
    throw new UploadError("Fichier trop lourd (25 Mo maximum).");
  }

  const extension = allowed[file.type];
  if (!extension) {
    throw new UploadError(`Format non supporté pour ${label} (${file.type || "type inconnu"}).`);
  }

  const id = randomUUID();
  const directory = prefix ? path.join(UPLOAD_DIR, prefix) : UPLOAD_DIR;
  const publicPath = prefix ? `/uploads/${prefix}` : "/uploads";
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(directory, { recursive: true });

  // Un PDF est stocké tel quel : rien à redimensionner.
  if (file.type === "application/pdf") {
    await writeFile(path.join(directory, `${id}.pdf`), buffer);
    return `${publicPath}/${id}.pdf`;
  }

  /**
   * Une photo d'iPhone pèse 4 à 5 Mo pour 4032 pixels de large. Affichée
   * dans une vignette de 50 pixels, c'est plusieurs secondes d'attente en
   * 4G pour rien. On produit donc deux JPEG : un pour l'affichage, un pour
   * les listes. `rotate()` applique l'orientation EXIF, sans quoi les
   * photos prises à la verticale arrivent couchées ; les métadonnées sont
   * abandonnées au passage, y compris les coordonnées GPS.
   */
  try {
    const source = sharp(buffer, { failOn: "none" }).rotate();

    const [full, thumb] = await Promise.all([
      source
        .clone()
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer(),
      source
        .clone()
        .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 72, mozjpeg: true })
        .toBuffer(),
    ]);

    await Promise.all([
      writeFile(path.join(directory, `${id}.jpg`), full),
      writeFile(path.join(directory, `${id}-thumb.jpg`), thumb),
    ]);

    return `${publicPath}/${id}.jpg`;
  } catch {
    // Format que sharp ne sait pas décoder (HEIC selon la build) : on
    // conserve l'original plutôt que de perdre la pièce jointe.
    await writeFile(path.join(directory, `${id}${extension}`), buffer);
    return `${publicPath}/${id}${extension}`;
  }
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
