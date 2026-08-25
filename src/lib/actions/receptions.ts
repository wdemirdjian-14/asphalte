"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  checkbox,
  failWith,
  integer,
  nextReference,
  number,
  optionalText,
  pickEnum,
  text,
  yearRange,
} from "@/lib/form";
import { PRODUCT_CATEGORIES } from "@/lib/labels";
import { REF_PREFIX } from "@/lib/refs";
import { applyStockMovement } from "@/lib/stock";

export async function createReceptionAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const reference = await nextReference(
    REF_PREFIX.reception,
    (year) => prisma.reception.count({ where: { createdAt: yearRange(year) } }),
    async (ref) =>
      (await prisma.reception.count({ where: { reference: ref } })) > 0,
  );

  const supplierName = text(formData, "supplierName");
  let supplierId = optionalText(formData, "supplierId");

  // Saisie rapide : un fournisseur inconnu est créé à la volée
  if (!supplierId && supplierName) {
    const supplier = await prisma.supplier.upsert({
      where: { name: supplierName },
      update: {},
      create: { name: supplierName },
    });
    supplierId = supplier.id;
  }

  const reception = await prisma.reception.create({
    data: {
      reference,
      supplierId,
      carrier: optionalText(formData, "carrier"),
      trackingNumber: optionalText(formData, "trackingNumber"),
      invoiceNumber: optionalText(formData, "invoiceNumber"),
      packageCount: integer(formData, "packageCount", 1),
      notes: optionalText(formData, "notes"),
      receivedById: user.id,
    },
  });

  revalidatePath("/admin/receptions");
  redirect(`/admin/receptions/${reception.id}`);
}

export async function updateReceptionAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = text(formData, "id");
  const target = `/admin/receptions/${id}`;

  const reception = await prisma.reception.findUniqueOrThrow({ where: { id } });
  if (reception.status === "VALIDE") {
    failWith(target, "Cette réception est validée : elle n'est plus modifiable.");
  }

  await prisma.reception.update({
    where: { id },
    data: {
      carrier: optionalText(formData, "carrier"),
      trackingNumber: optionalText(formData, "trackingNumber"),
      invoiceNumber: optionalText(formData, "invoiceNumber"),
      packageCount: integer(formData, "packageCount", 1),
      notes: optionalText(formData, "notes"),
    },
  });

  revalidatePath(target);
  redirect(target);
}

/**
 * Ajoute une ligne au colis. Si le produit n'existe pas encore au catalogue,
 * on crée sa fiche à la volée (stock à zéro : l'entrée réelle aura lieu à la
 * validation de la réception).
 */
export async function addReceptionLineAction(formData: FormData): Promise<void> {
  await requireUser();

  const receptionId = text(formData, "receptionId");
  const target = `/admin/receptions/${receptionId}`;

  const reception = await prisma.reception.findUniqueOrThrow({
    where: { id: receptionId },
  });
  if (reception.status === "VALIDE") {
    failWith(target, "Cette réception est validée : elle n'est plus modifiable.");
  }

  const quantity = integer(formData, "quantity", 0);
  if (quantity <= 0) {
    failWith(target, "La quantité reçue doit être supérieure à zéro.");
  }

  let productId = optionalText(formData, "productId");

  if (!productId) {
    const sku = text(formData, "newSku").toUpperCase();
    const name = text(formData, "newName");

    if (!sku || !name) {
      failWith(
        target,
        "Choisissez un produit du catalogue ou renseignez référence et nom pour en créer un.",
      );
    }

    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      productId = existing.id;
    } else {
      const created = await prisma.product.create({
        data: {
          sku,
          name,
          category: pickEnum(
            PRODUCT_CATEGORIES,
            text(formData, "newCategory"),
            "PIECE",
          ),
          brand: optionalText(formData, "newBrand"),
          purchasePrice: new Prisma.Decimal(number(formData, "unitCost", 0)),
          salePrice: new Prisma.Decimal(number(formData, "newSalePrice", 0)),
          stockQty: 0,
        },
      });
      productId = created.id;
    }
  }

  await prisma.receptionLine.create({
    data: {
      receptionId,
      productId,
      quantity,
      expectedQty: integer(formData, "expectedQty", quantity),
      unitCost: new Prisma.Decimal(number(formData, "unitCost", 0)),
      batch: optionalText(formData, "batch"),
      notes: optionalText(formData, "notes"),
    },
  });

  revalidatePath(target);
  redirect(target);
}

export async function deleteReceptionLineAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = text(formData, "id");
  const line = await prisma.receptionLine.findUniqueOrThrow({
    where: { id },
    include: { reception: { select: { id: true, status: true } } },
  });
  const target = `/admin/receptions/${line.reception.id}`;

  if (line.reception.status === "VALIDE") {
    failWith(target, "Cette réception est validée : elle n'est plus modifiable.");
  }

  await prisma.receptionLine.delete({ where: { id } });

  revalidatePath(target);
  redirect(target);
}

/**
 * Validation du colis : toutes les lignes entrent en stock en une seule
 * opération. Chaque ligne produit un mouvement de stock rattaché à la
 * réception (fournisseur, transporteur, n° de suivi, opérateur, date) —
 * c'est la traçabilité de l'entrée.
 */
export async function validateReceptionAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const id = text(formData, "id");
  const target = `/admin/receptions/${id}`;
  const updatePurchasePrice = checkbox(formData, "updatePurchasePrice");

  const reception = await prisma.reception.findUniqueOrThrow({
    where: { id },
    include: { lines: true },
  });

  if (reception.status === "VALIDE") {
    failWith(target, "Cette réception a déjà été validée.");
  }
  if (reception.lines.length === 0) {
    failWith(target, "Ajoutez au moins une ligne avant de valider le colis.");
  }

  await prisma.$transaction(async (tx) => {
    for (const line of reception.lines) {
      await applyStockMovement(tx, {
        productId: line.productId,
        type: "RECEPTION",
        quantity: line.quantity,
        unitCost: line.unitCost,
        reason: `Réception ${reception.reference}${
          line.batch ? ` — lot ${line.batch}` : ""
        }`,
        receptionId: reception.id,
        userId: user.id,
        userLabel: user.name,
      });

      if (updatePurchasePrice && Number(line.unitCost) > 0) {
        await tx.product.update({
          where: { id: line.productId },
          data: { purchasePrice: line.unitCost },
        });
      }
    }

    await tx.reception.update({
      where: { id },
      data: { status: "VALIDE", validatedAt: new Date(), receivedById: user.id },
    });
  });

  revalidatePath(target);
  revalidatePath("/admin/receptions");
  revalidatePath("/admin/produits");
  redirect(target);
}
