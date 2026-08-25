"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizePlate } from "@/lib/format";
import {
  failWith,
  optionalInteger,
  optionalText,
  pickEnum,
  text,
} from "@/lib/form";
import { VEHICLE_DOCUMENT_KINDS } from "@/lib/labels";
import { saveDocument, UploadError } from "@/lib/upload";

export async function createClientAction(formData: FormData): Promise<void> {
  await requireUser();

  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const phone = text(formData, "phone");

  if (!firstName || !lastName || !phone) {
    failWith("/admin/clients/nouveau", "Nom, prénom et téléphone sont obligatoires.");
  }

  const client = await prisma.client.create({
    data: {
      firstName,
      lastName,
      phone,
      company: optionalText(formData, "company"),
      email: optionalText(formData, "email"),
      phone2: optionalText(formData, "phone2"),
      address: optionalText(formData, "address"),
      postalCode: optionalText(formData, "postalCode"),
      city: optionalText(formData, "city"),
      notes: optionalText(formData, "notes"),
    },
  });

  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${client.id}`);
}

export async function updateClientAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = text(formData, "id");
  const target = `/admin/clients/${id}/modifier`;

  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const phone = text(formData, "phone");

  if (!firstName || !lastName || !phone) {
    failWith(target, "Nom, prénom et téléphone sont obligatoires.");
  }

  await prisma.client.update({
    where: { id },
    data: {
      firstName,
      lastName,
      phone,
      company: optionalText(formData, "company"),
      email: optionalText(formData, "email"),
      phone2: optionalText(formData, "phone2"),
      address: optionalText(formData, "address"),
      postalCode: optionalText(formData, "postalCode"),
      city: optionalText(formData, "city"),
      notes: optionalText(formData, "notes"),
    },
  });

  revalidatePath(`/admin/clients/${id}`);
  redirect(`/admin/clients/${id}`);
}

export async function createVehicleAction(formData: FormData): Promise<void> {
  await requireUser();

  const clientId = text(formData, "clientId");
  const target = `/admin/clients/${clientId}`;

  const plateDisplay = text(formData, "plate").toUpperCase();
  const brand = text(formData, "brand");
  const model = text(formData, "model");

  if (!plateDisplay || !brand || !model) {
    failWith(target, "Immatriculation, marque et modèle sont obligatoires.");
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      clientId,
      plate: normalizePlate(plateDisplay),
      plateDisplay,
      brand,
      model,
      year: optionalInteger(formData, "year"),
      displacement: optionalInteger(formData, "displacement"),
      mileage: optionalInteger(formData, "mileage"),
      vin: optionalText(formData, "vin"),
      color: optionalText(formData, "color"),
      notes: optionalText(formData, "notes"),
    },
  });

  revalidatePath(target);
  // On enchaîne sur la fiche du véhicule : c'est là qu'on photographie
  // la carte grise dans la foulée.
  redirect(`/admin/vehicules/${vehicle.id}`);
}

export async function deleteVehicleAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = text(formData, "id");
  const clientId = text(formData, "clientId");

  await prisma.vehicle.delete({ where: { id } });

  revalidatePath(`/admin/clients/${clientId}`);
  redirect(`/admin/clients/${clientId}`);
}

export async function updateVehicleAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = text(formData, "id");
  const target = `/admin/vehicules/${id}`;

  const plateDisplay = text(formData, "plate").toUpperCase();
  const brand = text(formData, "brand");
  const model = text(formData, "model");

  if (!plateDisplay || !brand || !model) {
    failWith(target, "Immatriculation, marque et modèle sont obligatoires.");
  }

  await prisma.vehicle.update({
    where: { id },
    data: {
      plate: normalizePlate(plateDisplay),
      plateDisplay,
      brand,
      model,
      year: optionalInteger(formData, "year"),
      displacement: optionalInteger(formData, "displacement"),
      mileage: optionalInteger(formData, "mileage"),
      vin: optionalText(formData, "vin"),
      color: optionalText(formData, "color"),
      notes: optionalText(formData, "notes"),
    },
  });

  revalidatePath(target);
  redirect(target);
}

/**
 * Photo d'un document du véhicule — la carte grise avant tout : une fois
 * prise en photo, on ne la redemande plus au client.
 */
export async function addVehicleDocumentAction(formData: FormData): Promise<void> {
  await requireUser();

  const vehicleId = text(formData, "vehicleId");
  const target = `/admin/vehicules/${vehicleId}`;
  const file = formData.get("document");

  if (!(file instanceof File) || file.size === 0) {
    failWith(target, "Aucun document sélectionné.");
  }

  let url: string;
  try {
    url = await saveDocument(file);
  } catch (error) {
    failWith(
      target,
      error instanceof UploadError ? error.message : "Envoi du document impossible.",
    );
  }

  await prisma.vehicleDocument.create({
    data: {
      vehicleId,
      url,
      kind: pickEnum(VEHICLE_DOCUMENT_KINDS, text(formData, "kind"), "CARTE_GRISE"),
      label: text(formData, "label"),
    },
  });

  revalidatePath(target);
  redirect(target);
}

export async function deleteVehicleDocumentAction(
  formData: FormData,
): Promise<void> {
  await requireUser();

  const id = text(formData, "id");
  const document = await prisma.vehicleDocument.delete({ where: { id } });
  const target = `/admin/vehicules/${document.vehicleId}`;

  revalidatePath(target);
  redirect(target);
}
