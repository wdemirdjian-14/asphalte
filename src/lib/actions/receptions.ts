"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  failWith,
  integer,
  nextReference,
  optionalText,
  text,
  yearRange,
} from "@/lib/form";
import { REF_PREFIX } from "@/lib/refs";
import { nextSku } from "@/lib/sku";
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
      packageCount: integer(formData, "packageCount", 1),
      notes: optionalText(formData, "notes"),
    },
  });

  revalidatePath(target);
  redirect(target);
}

/**
 * Ajoute un produit déjà au catalogue au colis en cours.
 * Un seul clic depuis la liste de résultats de la recherche.
 */
export async function addReceptionLineAction(formData: FormData): Promise<void> {
  await requireUser();

  const receptionId = text(formData, "receptionId");
  const query = text(formData, "q");
  const target = `/admin/receptions/${receptionId}${
    query ? `?q=${encodeURIComponent(query)}` : ""
  }`;

  const reception = await prisma.reception.findUniqueOrThrow({
    where: { id: receptionId },
  });
  if (reception.status === "VALIDE") {
    failWith(target, "Cette réception est validée : elle n'est plus modifiable.");
  }

  const productId = text(formData, "productId");
  const quantity = integer(formData, "quantity", 1);
  if (quantity <= 0) failWith(target, "La quantité doit être supérieure à zéro.");

  // Deux passages sur le même produit s'additionnent au lieu de créer un doublon
  const existing = await prisma.receptionLine.findFirst({
    where: { receptionId, productId },
  });

  if (existing) {
    await prisma.receptionLine.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await prisma.receptionLine.create({
      data: { receptionId, productId, quantity },
    });
  }

  revalidatePath(target);
  redirect(target);
}

/**
 * Le produit n'existe pas encore : on crée sa fiche et on l'ajoute au colis
 * en une seule action, directement depuis la barre de recherche.
 */
export async function createProductAndAddLineAction(
  formData: FormData,
): Promise<void> {
  await requireUser();

  const receptionId = text(formData, "receptionId");
  const target = `/admin/receptions/${receptionId}`;

  const reception = await prisma.reception.findUniqueOrThrow({
    where: { id: receptionId },
  });
  if (reception.status === "VALIDE") {
    failWith(target, "Cette réception est validée : elle n'est plus modifiable.");
  }

  const name = text(formData, "name");
  if (!name) failWith(target, "Donnez un nom au produit à créer.");

  const quantity = integer(formData, "quantity", 1);
  if (quantity <= 0) failWith(target, "La quantité doit être supérieure à zéro.");

  const product = await prisma.product.create({
    data: { sku: await nextSku(), name },
  });

  await prisma.receptionLine.create({
    data: { receptionId, productId: product.id, quantity },
  });

  revalidatePath(target);
  revalidatePath("/admin/produits");
  redirect(target);
}

export async function updateReceptionLineAction(formData: FormData): Promise<void> {
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

  const quantity = integer(formData, "quantity", line.quantity);
  if (quantity <= 0) failWith(target, "La quantité doit être supérieure à zéro.");

  await prisma.receptionLine.update({ where: { id }, data: { quantity } });

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
 * opération. Chaque ligne produit un mouvement rattaché à la réception —
 * fournisseur, transporteur, numéro de suivi, opérateur et date.
 */
export async function validateReceptionAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const id = text(formData, "id");
  const target = `/admin/receptions/${id}`;

  const reception = await prisma.reception.findUniqueOrThrow({
    where: { id },
    include: { lines: true },
  });

  if (reception.status === "VALIDE") {
    failWith(target, "Cette réception a déjà été validée.");
  }
  if (reception.lines.length === 0) {
    failWith(target, "Ajoutez au moins un produit avant de valider le colis.");
  }

  await prisma.$transaction(async (tx) => {
    for (const line of reception.lines) {
      await applyStockMovement(tx, {
        productId: line.productId,
        type: "RECEPTION",
        quantity: line.quantity,
        reason: `Réception ${reception.reference}`,
        receptionId: reception.id,
        userId: user.id,
        userLabel: user.name,
      });
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
