"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { failWith, pickEnum, successAt, text } from "@/lib/form";
import { MESSAGE_STATUSES } from "@/lib/labels";
import { emailLayout, escapeHtml, sendMail } from "@/lib/mail";

export async function setMessageStatusAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = text(formData, "id");
  await prisma.contactMessage.update({
    where: { id },
    data: {
      status: pickEnum(MESSAGE_STATUSES, text(formData, "status"), "LU"),
    },
  });

  revalidatePath("/admin/messages");
  revalidatePath(`/admin/messages/${id}`);
  revalidatePath("/admin");
  redirect(text(formData, "origin") || "/admin/messages");
}

export async function deleteMessageAction(formData: FormData): Promise<void> {
  await requireUser();

  await prisma.contactMessage.delete({ where: { id: text(formData, "id") } });

  revalidatePath("/admin/messages");
  redirect("/admin/messages");
}

/**
 * Réponse de l'atelier. Elle est enregistrée dans le fil quoi qu'il arrive,
 * puis envoyée par e-mail au client. Un échec d'envoi est conservé sur la
 * réponse : le fil ne ment jamais sur ce qui est réellement parti.
 */
export async function replyToMessageAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const id = text(formData, "id");
  const target = `/admin/messages/${id}`;
  const body = text(formData, "body");

  if (body.length < 2) {
    failWith(target, "Écrivez votre réponse avant d'envoyer.");
  }

  const message = await prisma.contactMessage.findUniqueOrThrow({
    where: { id },
  });

  let emailSent = false;
  let emailError: string | null = null;

  if (!message.email) {
    emailError =
      "Le client n'a pas laissé d'adresse e-mail : rappelez-le au " + message.phone;
  } else {
    const result = await sendMail({
      to: message.email,
      subject: `Votre demande auprès d'Asphalte${
        message.subject ? ` — ${message.subject}` : ""
      }`,
      text: `Bonjour ${message.name},\n\n${body}\n\n—\nAsphalte — Dépannage et réparation 2 roues\n31 bis route de la Reine, 92100 Boulogne-Billancourt\nTél. 01 47 12 12 12\n\nVotre message initial :\n${message.message}`,
      html: emailLayout({
        title: `Bonjour ${escapeHtml(message.name)},`,
        bodyHtml: `
          <div style="font-size:15px;line-height:1.6;white-space:pre-line;">${escapeHtml(body)}</div>
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e4e4e7;font-size:13px;color:#6e6e6e;">
            <strong style="color:#3a3a3a;">Votre message :</strong>
            <div style="margin-top:6px;white-space:pre-line;">${escapeHtml(message.message)}</div>
          </div>`,
        footer:
          "Asphalte — 31 bis route de la Reine, 92100 Boulogne-Billancourt — Tél. 01 47 12 12 12",
      }),
    });

    emailSent = result.sent;
    if (!result.sent) emailError = result.reason;
  }

  await prisma.$transaction([
    prisma.messageReply.create({
      data: {
        messageId: id,
        body,
        authorId: user.id,
        authorName: user.name,
        emailSent,
        emailError,
      },
    }),
    prisma.contactMessage.update({
      where: { id },
      data: { status: "TRAITE" },
    }),
  ]);

  revalidatePath(target);
  revalidatePath("/admin/messages");
  revalidatePath("/admin");

  if (emailSent) {
    successAt(target, `Réponse envoyée à ${message.email}.`);
  }
  failWith(target, `Réponse enregistrée, mais non envoyée : ${emailError}`);
}
