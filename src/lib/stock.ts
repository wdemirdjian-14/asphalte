import type { MovementType, Prisma } from "@prisma/client";

export type MovementContext = {
  productId: string;
  type: MovementType;
  /** Signé : positif pour une entrée, négatif pour une sortie. */
  quantity: number;
  reason?: string | null;
  unitCost?: Prisma.Decimal | number | null;
  receptionId?: string | null;
  saleId?: string | null;
  interventionId?: string | null;
  userId?: string | null;
  userLabel: string;
};

/**
 * Applique un mouvement de stock et le journalise dans le même temps.
 * Toujours appelé dans une transaction : le stock du produit et la ligne de
 * journal ne peuvent pas diverger.
 */
export async function applyStockMovement(
  tx: Prisma.TransactionClient,
  movement: MovementContext,
): Promise<void> {
  if (movement.quantity === 0) return;

  const product = await tx.product.findUniqueOrThrow({
    where: { id: movement.productId },
    select: { stockQty: true },
  });

  const stockBefore = product.stockQty;
  const stockAfter = stockBefore + movement.quantity;

  await tx.product.update({
    where: { id: movement.productId },
    data: { stockQty: stockAfter },
  });

  await tx.stockMovement.create({
    data: {
      productId: movement.productId,
      type: movement.type,
      quantity: movement.quantity,
      stockBefore,
      stockAfter,
      unitCost: movement.unitCost ?? null,
      reason: movement.reason ?? null,
      receptionId: movement.receptionId ?? null,
      saleId: movement.saleId ?? null,
      interventionId: movement.interventionId ?? null,
      userId: movement.userId ?? null,
      userLabel: movement.userLabel,
    },
  });
}
