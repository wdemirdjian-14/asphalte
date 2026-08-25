"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  failWith,
  nextReference,
  number,
  optionalText,
  text,
  yearRange,
} from "@/lib/form";
import { REF_PREFIX } from "@/lib/refs";
import { applyStockMovement } from "@/lib/stock";

/** Vente comptoir d'un accessoire ou d'une pièce, rattachée au client. */
export async function createSaleAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const clientId = text(formData, "clientId");
  const target = `/admin/clients/${clientId}`;
  const productId = text(formData, "productId");
  const quantity = Math.round(number(formData, "quantity", 1));

  if (!productId) failWith(target, "Choisissez un produit.");
  if (quantity <= 0) failWith(target, "La quantité doit être supérieure à zéro.");

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
  });

  if (product.stockQty < quantity) {
    failWith(
      target,
      `Stock insuffisant pour ${product.name} (${product.stockQty} en rayon).`,
    );
  }

  const unitPrice = formData.get("unitPrice")
    ? new Prisma.Decimal(number(formData, "unitPrice", 0))
    : product.salePrice;

  const reference = await nextReference(
    REF_PREFIX.sale,
    (year) => prisma.sale.count({ where: { createdAt: yearRange(year) } }),
    async (ref) => (await prisma.sale.count({ where: { reference: ref } })) > 0,
  );

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        reference,
        clientId,
        notes: optionalText(formData, "notes"),
        totalAmount: unitPrice.mul(quantity),
        lines: {
          create: [
            {
              productId,
              label: product.name,
              quantity: new Prisma.Decimal(quantity),
              unitPrice,
            },
          ],
        },
      },
    });

    await applyStockMovement(tx, {
      productId,
      type: "VENTE",
      quantity: -quantity,
      reason: `Vente ${sale.reference}`,
      saleId: sale.id,
      userId: user.id,
      userLabel: user.name,
    });
  });

  revalidatePath(target);
  revalidatePath("/admin/produits");
  redirect(target);
}
