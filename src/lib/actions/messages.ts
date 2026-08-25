"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pickEnum, text } from "@/lib/form";
import { MESSAGE_STATUSES } from "@/lib/labels";

export async function setMessageStatusAction(formData: FormData): Promise<void> {
  await requireUser();

  await prisma.contactMessage.update({
    where: { id: text(formData, "id") },
    data: {
      status: pickEnum(MESSAGE_STATUSES, text(formData, "status"), "LU"),
    },
  });

  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  redirect("/admin/messages");
}

export async function deleteMessageAction(formData: FormData): Promise<void> {
  await requireUser();

  await prisma.contactMessage.delete({ where: { id: text(formData, "id") } });

  revalidatePath("/admin/messages");
  redirect("/admin/messages");
}
