import { prisma } from "@/lib/db";

/**
 * Référence interne auto-générée : P-0001, P-0002…
 * L'atelier n'a pas à en saisir une, mais chaque produit reste identifiable.
 */
export async function nextSku(): Promise<string> {
  let sequence = (await prisma.product.count()) + 1;
  let sku = `P-${String(sequence).padStart(4, "0")}`;

  while (await prisma.product.findUnique({ where: { sku } })) {
    sequence += 1;
    sku = `P-${String(sequence).padStart(4, "0")}`;
  }

  return sku;
}
