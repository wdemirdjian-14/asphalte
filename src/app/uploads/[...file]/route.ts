import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { getSessionUser } from "@/lib/auth";
import { DOCUMENTS_PREFIX, UPLOAD_DIR } from "@/lib/upload";

/**
 * Sert les fichiers envoyés depuis le backoffice.
 *
 * Next.js dresse la liste des fichiers de `public/` au démarrage du serveur :
 * un fichier écrit ensuite renvoie 404 jusqu'au redémarrage suivant. On ne
 * peut donc pas compter sur le service statique pour des envois faits en
 * cours d'exécution — cette route lit le disque à chaque requête.
 */

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".pdf": "application/pdf",
};

function notFound(): Response {
  return new Response("Fichier introuvable.", { status: 404 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string[] }> },
) {
  const { file } = await params;
  const relative = file.join("/");

  // Le dossier des documents contient des données personnelles
  // (carte grise : nom, adresse, immatriculation) : session obligatoire.
  if (file[0] === DOCUMENTS_PREFIX && !(await getSessionUser())) {
    return notFound();
  }

  const target = path.resolve(UPLOAD_DIR, relative);
  // Garde-fou contre les remontées d'arborescence (../../etc/passwd)
  if (target !== UPLOAD_DIR && !target.startsWith(UPLOAD_DIR + path.sep)) {
    return notFound();
  }

  const contentType = CONTENT_TYPES[path.extname(target).toLowerCase()];
  if (!contentType) return notFound();

  let size: number;
  try {
    const info = await stat(target);
    if (!info.isFile()) return notFound();
    size = info.size;
  } catch {
    return notFound();
  }

  const data = await readFile(target);

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Content-Disposition": "inline",
      // Les noms de fichiers sont des UUID : le contenu ne change jamais.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
