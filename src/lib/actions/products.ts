"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  checkbox,
  failWith,
  integer,
  optionalText,
  pickEnum,
  text,
} from "@/lib/form";
import { PRODUCT_CATEGORIES } from "@/lib/labels";
import { nextSku } from "@/lib/sku";
import { applyStockMovement } from "@/lib/stock";
import { saveImage, UploadError } from "@/lib/upload";

/**
 * Création d'un produit réduite à l'essentiel : un nom, une photo,
 * une quantité. Tout le reste est optionnel.
 */
export async function createProductAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const origin = text(formData, "origin") || "/admin/produits/nouveau";
  const name = text(formData, "name");
  if (!name) failWith(origin, "Le nom du produit est obligatoire.");

  const stockQty = integer(formData, "stockQty", 0);

  const product = await prisma.product.create({
    data: {
      sku: await nextSku(),
      name,
      notes: optionalText(formData, "notes"),
      category: pickEnum(PRODUCT_CATEGORIES, text(formData, "category"), "AUTRE"),
      brand: optionalText(formData, "brand"),
      location: optionalText(formData, "location"),
      stockAlert: integer(formData, "stockAlert", 0),
      stockQty: 0,
    },
  });

  // Photo prise directement depuis le téléphone, si elle est fournie
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      const url = await saveImage(photo);
      await prisma.productPhoto.create({
        data: { productId: product.id, url, alt: name, position: 0 },
      });
    } catch (error) {
      // La fiche est créée : on signale l'échec sans perdre la saisie.
      await prisma.product.update({
        where: { id: product.id },
        data: {
          notes: [
            product.notes,
            error instanceof UploadError ? `Photo refusée : ${error.message}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      });
    }
  }

  if (stockQty > 0) {
    await prisma.$transaction(async (tx) => {
      await applyStockMovement(tx, {
        productId: product.id,
        type: "INVENTAIRE",
        quantity: stockQty,
        reason: "Stock initial à la création de la fiche",
        userId: user.id,
        userLabel: user.name,
      });
    });
  }

  revalidatePath("/admin/produits");
  redirect(`/admin/produits/${product.id}`);
}

export async function updateProductAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = text(formData, "id");
  const target = `/admin/produits/${id}`;

  await prisma.product.update({
    where: { id },
    data: {
      name: text(formData, "name"),
      notes: optionalText(formData, "notes"),
      category: pickEnum(PRODUCT_CATEGORIES, text(formData, "category"), "AUTRE"),
      brand: optionalText(formData, "brand"),
      location: optionalText(formData, "location"),
      stockAlert: integer(formData, "stockAlert", 0),
      active: checkbox(formData, "active"),
    },
  });

  revalidatePath(target);
  revalidatePath("/admin/produits");
  redirect(target);
}

/**
 * Correction de stock. `delta` sert aux boutons +1 / −1 de la fiche,
 * `quantity` au champ libre.
 */
export async function adjustStockAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const productId = text(formData, "productId");
  const target = `/admin/produits/${productId}`;

  const delta = integer(formData, "delta", 0);
  const quantity = delta !== 0 ? delta : integer(formData, "quantity", 0);
  const reason = text(formData, "reason") || (delta !== 0 ? "Correction rapide" : "");

  if (quantity === 0) {
    failWith(target, "Indiquez une quantité différente de zéro (négative pour une sortie).");
  }
  if (!reason) {
    failWith(target, "Un motif est obligatoire : c'est ce qui rend l'ajustement traçable.");
  }

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    select: { stockQty: true },
  });

  if (product.stockQty + quantity < 0) {
    failWith(target, "Le stock ne peut pas devenir négatif.");
  }

  await prisma.$transaction(async (tx) => {
    await applyStockMovement(tx, {
      productId,
      type: "AJUSTEMENT",
      quantity,
      reason,
      userId: user.id,
      userLabel: user.name,
    });
  });

  revalidatePath(target);
  revalidatePath("/admin/produits");
  redirect(target);
}

export async function addProductPhotoAction(formData: FormData): Promise<void> {
  await requireUser();

  const productId = text(formData, "productId");
  const target = `/admin/produits/${productId}`;
  const file = formData.get("photo");

  if (!(file instanceof File) || file.size === 0) {
    failWith(target, "Aucune photo sélectionnée.");
  }

  let url: string;
  try {
    url = await saveImage(file);
  } catch (error) {
    failWith(
      target,
      error instanceof UploadError ? error.message : "Envoi de la photo impossible.",
    );
  }

  const count = await prisma.productPhoto.count({ where: { productId } });
  await prisma.productPhoto.create({
    data: { productId, url, alt: text(formData, "alt"), position: count },
  });

  revalidatePath(target);
  revalidatePath("/admin/produits");
  redirect(target);
}

export async function deleteProductPhotoAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = text(formData, "id");
  const photo = await prisma.productPhoto.delete({ where: { id } });
  const target = `/admin/produits/${photo.productId}`;

  revalidatePath(target);
  redirect(target);
}
