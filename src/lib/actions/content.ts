"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { failWith, successAt, text } from "@/lib/form";
import { SITE_CONTENT_KEYS } from "@/lib/site-content";
import { saveImage, UploadError } from "@/lib/upload";

export async function saveSiteContentAction(formData: FormData): Promise<void> {
  await requireUser();

  const updates = SITE_CONTENT_KEYS.map((key) => ({
    key,
    value: text(formData, key),
  }));

  await prisma.$transaction(
    updates.map(({ key, value }) =>
      prisma.siteContent.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    ),
  );

  revalidatePath("/");
  revalidatePath("/admin/contenu");
  successAt("/admin/contenu", "Contenu de la page publique mis à jour.");
}

/** Remplace la photo mise en avant sur la page d'accueil. */
export async function uploadHeroImageAction(formData: FormData): Promise<void> {
  await requireUser();

  const file = formData.get("photo");
  if (!(file instanceof File)) {
    failWith("/admin/contenu", "Aucune photo sélectionnée.");
  }

  let url: string;
  try {
    url = await saveImage(file);
  } catch (error) {
    failWith(
      "/admin/contenu",
      error instanceof UploadError ? error.message : "Envoi de la photo impossible.",
    );
  }

  await prisma.siteContent.upsert({
    where: { key: "hero.image" },
    update: { value: url },
    create: { key: "hero.image", value: url },
  });

  const alt = text(formData, "alt");
  if (alt) {
    await prisma.siteContent.upsert({
      where: { key: "hero.imageAlt" },
      update: { value: alt },
      create: { key: "hero.imageAlt", value: alt },
    });
  }

  revalidatePath("/");
  revalidatePath("/admin/contenu");
  successAt("/admin/contenu", "Photo du garage mise à jour.");
}

export async function resetSiteContentAction(): Promise<void> {
  await requireUser();

  await prisma.siteContent.deleteMany({});

  revalidatePath("/");
  revalidatePath("/admin/contenu");
  successAt("/admin/contenu", "Contenu réinitialisé aux valeurs par défaut.");
}
