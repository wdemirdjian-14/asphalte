"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  failWith,
  integer,
  nextReference,
  optionalInteger,
  optionalText,
  pickEnum,
  text,
  yearRange,
} from "@/lib/form";
import { INTERVENTION_STATUSES, INTERVENTION_TYPES } from "@/lib/labels";
import { REF_PREFIX } from "@/lib/refs";
import { applyStockMovement } from "@/lib/stock";

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
    },
  });

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
      completedAt:
        status === "TERMINE" || status === "FACTURE" ? new Date() : null,
    },
  });

  revalidatePath(target);
  redirect(target);
}

/**
 * Prestations réalisées : une seule validation enregistre toutes les cases
 * cochées du catalogue, plus une éventuelle prestation libre.
 */
export async function saveInterventionServicesAction(
  formData: FormData,
): Promise<void> {
  await requireUser();

  const interventionId = text(formData, "interventionId");
  const target = `/admin/interventions/${interventionId}`;

  const checked = formData
    .getAll("serviceTaskId")
    .map((value) => value.toString())
    .filter(Boolean);

  const tasks = await prisma.serviceTask.findMany({
    where: { id: { in: checked } },
  });

  const custom = text(formData, "customService");

  await prisma.$transaction(async (tx) => {
    // Les prestations issues du catalogue sont remplacées par la sélection ;
    // celles saisies à la main sont conservées.
    await tx.interventionService.deleteMany({
      where: { interventionId, serviceTaskId: { not: null } },
    });

    if (tasks.length > 0) {
      await tx.interventionService.createMany({
        data: tasks.map((task) => ({
          interventionId,
          serviceTaskId: task.id,
          label: task.name,
        })),
        skipDuplicates: true,
      });
    }

    if (custom) {
      await tx.interventionService.createMany({
        data: [{ interventionId, label: custom }],
        skipDuplicates: true,
      });
    }
  });

  revalidatePath(target);
  redirect(target);
}

export async function deleteInterventionServiceAction(
  formData: FormData,
): Promise<void> {
  await requireUser();

  const id = text(formData, "id");
  const service = await prisma.interventionService.delete({ where: { id } });
  const target = `/admin/interventions/${service.interventionId}`;

  revalidatePath(target);
  redirect(target);
}

/**
 * Ajoute une pièce à l'intervention. Une pièce du catalogue sort du stock
 * et le mouvement reste rattaché au dossier.
 */
export async function addInterventionPartAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const interventionId = text(formData, "interventionId");
  const target = `/admin/interventions/${interventionId}`;
  const productId = optionalText(formData, "productId");
  const quantity = integer(formData, "quantity", 1);

  if (quantity <= 0) failWith(target, "La quantité doit être supérieure à zéro.");

  const intervention = await prisma.intervention.findUniqueOrThrow({
    where: { id: interventionId },
    select: { reference: true },
  });

  let label = text(formData, "label");

  if (productId) {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    label = label || product.name;
  }

  if (!label) {
    failWith(target, "Indiquez un libellé ou choisissez une pièce du stock.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.interventionPart.create({
      data: { interventionId, productId, label, quantity },
    });

    if (productId) {
      await applyStockMovement(tx, {
        productId,
        type: "INTERVENTION",
        quantity: -quantity,
        reason: `Montée sur ${intervention.reference}`,
        interventionId,
        userId: user.id,
        userLabel: user.name,
      });
    }
  });

  revalidatePath(target);
  revalidatePath("/admin/produits");
  redirect(target);
}

export async function deleteInterventionPartAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();

  const id = text(formData, "id");
  const part = await prisma.interventionPart.findUniqueOrThrow({
    where: { id },
    include: { intervention: { select: { id: true, reference: true } } },
  });
  const target = `/admin/interventions/${part.intervention.id}`;

  await prisma.$transaction(async (tx) => {
    await tx.interventionPart.delete({ where: { id } });

    if (part.productId) {
      // Retour en stock de la pièce retirée du dossier
      await applyStockMovement(tx, {
        productId: part.productId,
        type: "RETOUR",
        quantity: part.quantity,
        reason: `Pièce retirée de ${part.intervention.reference}`,
        interventionId: part.intervention.id,
        userId: user.id,
        userLabel: user.name,
      });
    }
  });

  revalidatePath(target);
  revalidatePath("/admin/produits");
  redirect(target);
}
