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
  number,
  optionalText,
  pickEnum,
  text,
} from "@/lib/form";
import { PRODUCT_CATEGORIES } from "@/lib/labels";
import { applyStockMovement } from "@/lib/stock";
import { saveImage, UploadError } from "@/lib/upload";

export async function createProductAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const sku = text(formData, "sku").toUpperCase();
  const name = text(formData, "name");

  if (!sku || !name) {
    failWith("/admin/produits/nouveau", "La référence et le nom sont obligatoires.");
  }

  if (await prisma.product.findUnique({ where: { sku } })) {
    failWith("/admin/produits/nouveau", `La référence ${sku} existe déjà.`);
  }

  const stockQty = integer(formData, "stockQty", 0);

  const product = await prisma.product.create({
    data: {
      sku,
      name,
      description: optionalText(formData, "description"),
      category: pickEnum(PRODUCT_CATEGORIES, text(formData, "category"), "PIECE"),
      brand: optionalText(formData, "brand"),
      barcode: optionalText(formData, "barcode"),
      location: optionalText(formData, "location"),
      purchasePrice: new Prisma.Decimal(number(formData, "purchasePrice", 0)),
      salePrice: new Prisma.Decimal(number(formData, "salePrice", 0)),
      vatRate: new Prisma.Decimal(number(formData, "vatRate", 20)),
      stockAlert: integer(formData, "stockAlert", 0),
      stockQty: 0,
    },
  });

  if (stockQty !== 0) {
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
      description: optionalText(formData, "description"),
      category: pickEnum(PRODUCT_CATEGORIES, text(formData, "category"), "PIECE"),
      brand: optionalText(formData, "brand"),
      barcode: optionalText(formData, "barcode"),
      location: optionalText(formData, "location"),
      purchasePrice: new Prisma.Decimal(number(formData, "purchasePrice", 0)),
      salePrice: new Prisma.Decimal(number(formData, "salePrice", 0)),
      vatRate: new Prisma.Decimal(number(formData, "vatRate", 20)),
      stockAlert: integer(formData, "stockAlert", 0),
      active: checkbox(formData, "active"),
    },
  });

  revalidatePath(target);
  revalidatePath("/admin/produits");
  redirect(target);
}

/** Correction manuelle de stock (casse, erreur d'inventaire, retour…). */
export async function adjustStockAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const productId = text(formData, "productId");
  const target = `/admin/produits/${productId}`;
  const quantity = integer(formData, "quantity", 0);
  const reason = text(formData, "reason");

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

  if (!(file instanceof File)) {
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
