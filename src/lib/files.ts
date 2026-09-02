import path from "node:path";

/**
 * Chemin de la vignette associée à une image : `/uploads/x.jpg` devient
 * `/uploads/x-thumb.jpg`. Les envois antérieurs à la mise en place des
 * vignettes n'en ont pas — la route de service sert alors l'original.
 */
export function thumbUrl(url: string): string {
  const extension = path.extname(url);
  if (!extension || extension.toLowerCase() === ".pdf") return url;
  return `${url.slice(0, -extension.length)}-thumb.jpg`;
}

/** Un PDF ne s'affiche pas dans une balise <img> : il faut une vignette. */
export function isPdf(url: string): boolean {
  return url.toLowerCase().endsWith(".pdf");
}
