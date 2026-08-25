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
  optionalInteger,
  optionalText,
  pickEnum,
  text,
  yearRange,
} from "@/lib/form";
import { INTERVENTION_STATUSES, INTERVENTION_TYPES } from "@/lib/labels";
import { REF_PREFIX } from "@/lib/refs";
import { applyStockMovement } from "@/lib/stock";

async function recomputeTotals(interventionId: string): Promise<void> {
  const intervention = await prisma.intervention.findUniqueOrThrow({
    where: { id: interventionId },
    include: { lines: true },
  });

  const partsTotal = intervention.lines.reduce(
    (sum, line) => sum.add(line.unitPrice.mul(line.quantity)),
    new Prisma.Decimal(0),
  );
  const labor = intervention.laborHours.mul(intervention.laborRate);

  await prisma.intervention.update({
    where: { id: interventionId },
    data: { partsTotal, totalAmount: partsTotal.add(labor) },
  });
}

export async function createInterventionAction(formData: FormData): Promise<void> {
  await requireUser();

  const clientId = text(formData, "clientId");
  const origin = text(formData, "origin") || `/admin/clients/${clientId}`;
  const title = text(formData, "title");

  if (!clientId || !title) {
    failWith(origin, "Le client et l'intitulé sont obligatoires.");
  }

  const reference = await nextReference(
    REF_PREFIX.intervention,
    (year) =>
      prisma.intervention.count({ where: { createdAt: yearRange(year) } }),
    async (ref) =>
      (await prisma.intervention.count({ where: { reference: ref } })) > 0,
  );

  const intervention = await prisma.intervention.create({
    data: {
      reference,
      clientId,
      vehicleId: optionalText(formData, "vehicleId"),
      type: pickEnum(INTERVENTION_TYPES, text(formData, "type"), "DEPANNAGE"),
      status: pickEnum(INTERVENTION_STATUSES, text(formData, "status"), "OUVERT"),
      title,
      description: optionalText(formData, "description"),
      pickupLocation: optionalText(formData, "pickupLocation"),
      dropoffLocation: optionalText(formData, "dropoffLocation"),
      mileage: optionalInteger(formData, "mileage"),
      laborHours: new Prisma.Decimal(number(formData, "laborHours", 0)),
      laborRate: new Prisma.Decimal(number(formData, "laborRate", 70)),
    },
  });

  await recomputeTotals(intervention.id);

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/interventions");
  redirect(`/admin/interventions/${intervention.id}`);
}

export async function updateInterventionAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = text(formData, "id");
  const target = `/admin/interventions/${id}`;
  const status = pickEnum(INTERVENTION_STATUSES, text(formData, "status"), "OUVERT");

  await prisma.intervention.update({
    where: { id },
    data: {
      status,
      type: pickEnum(INTERVENTION_TYPES, text(formData, "type"), "DEPANNAGE"),
      title: text(formData, "title"),
      description: optionalText(formData, "description"),
      pickupLocation: optionalText(formData, "pickupLocation"),
      dropoffLocation: optionalText(formData, "dropoffLocation"),
      mileage: optionalInteger(formData, "mileage"),
      laborHours: new Prisma.Decimal(number(formData, "laborHours", 0)),
      laborRate: new Prisma.Decimal(number(formData, "laborRate", 70)),
      completedAt:
        status === "TERMINE" || status === "FACTURE" ? new Date() : null,
    },
  });

  await recomputeTotals(id);

  revalidatePath(target);
  redirect(target);
}

/**
 * Ajoute une pièce à l'intervention. Si la pièce vient du stock, la sortie
 * est enregistrée et journalisée dans la même transaction.
 */
export async function addInterventionLineAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const interventionId = text(formData, "interventionId");
  const target = `/admin/interventions/${interventionId}`;
  const productId = optionalText(formData, "productId");
  const quantity = number(formData, "quantity", 1);

  if (quantity <= 0) {
    failWith(target, "La quantité doit être supérieure à zéro.");
  }

  const intervention = await prisma.intervention.findUniqueOrThrow({
    where: { id: interventionId },
    select: { reference: true },
  });

  let label = text(formData, "label");
  let unitPrice = number(formData, "unitPrice", 0);

  if (productId) {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    label = label || product.name;
    if (!formData.get("unitPrice")) unitPrice = Number(product.salePrice);
  }

  if (!label) {
    failWith(target, "Indiquez un libellé ou choisissez un produit.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.interventionLine.create({
      data: {
        interventionId,
        productId,
        label,
        quantity: new Prisma.Decimal(quantity),
        unitPrice: new Prisma.Decimal(unitPrice),
      },
    });

    if (productId) {
      await applyStockMovement(tx, {
        productId,
        type: "INTERVENTION",
        quantity: -Math.round(quantity),
        reason: `Montée sur ${intervention.reference}`,
        interventionId,
        userId: user.id,
        userLabel: user.name,
      });
    }
  });

  await recomputeTotals(interventionId);

  revalidatePath(target);
  revalidatePath("/admin/produits");
  redirect(target);
}

export async function deleteInterventionLineAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();

  const id = text(formData, "id");
  const line = await prisma.interventionLine.findUniqueOrThrow({
    where: { id },
    include: { intervention: { select: { id: true, reference: true } } },
  });
  const target = `/admin/interventions/${line.intervention.id}`;

  await prisma.$transaction(async (tx) => {
    await tx.interventionLine.delete({ where: { id } });

    if (line.productId) {
      // Retour en stock de la pièce retirée du dossier
      await applyStockMovement(tx, {
        productId: line.productId,
        type: "RETOUR",
        quantity: Math.round(Number(line.quantity)),
        reason: `Ligne retirée de ${line.intervention.reference}`,
        interventionId: line.intervention.id,
        userId: user.id,
        userLabel: user.name,
      });
    }
  });

  await recomputeTotals(line.intervention.id);

  revalidatePath(target);
  redirect(target);
}
