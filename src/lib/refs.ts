/**
 * Références lisibles à l'atelier : DEP-2026-0007, VTE-2026-0012, REC-2026-0003.
 * Le compteur est calculé à partir du nombre d'enregistrements de l'année.
 */
export function buildReference(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

export const REF_PREFIX = {
  intervention: "DEP",
  sale: "VTE",
  reception: "REC",
} as const;
