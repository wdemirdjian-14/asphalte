import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { normalizePlate } from "@/lib/format";
import { atelierMailbox, emailLayout, escapeHtml, sendMail } from "@/lib/mail";
import { notifyAll } from "@/lib/push";

const schema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(120),
  phone: z
    .string()
    .trim()
    .min(6, "Téléphone invalide")
    .max(30)
    .regex(/^[\d\s().+-]+$/, "Téléphone invalide"),
  email: z.string().trim().email("E-mail invalide").max(160).optional().or(z.literal("")),
  plate: z.string().trim().max(20).optional().or(z.literal("")),
  subject: z.string().trim().max(80).optional().or(z.literal("")),
  message: z.string().trim().min(5, "Message trop court").max(4000),
  // Champ piège : rempli uniquement par les robots
  website: z.string().max(0).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Formulaire incomplet." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  if (data.website) {
    // Robot détecté : on répond 200 sans rien enregistrer.
    return NextResponse.json({ ok: true });
  }

  let message;
  try {
    message = await prisma.contactMessage.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        plate: data.plate ? normalizePlate(data.plate) : null,
        subject: data.subject || null,
        message: data.message,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Le message n'a pas pu être enregistré. Appelez-nous." },
      { status: 500 },
    );
  }

  // Le message est en base : les alertes ne doivent plus faire échouer la
  // réponse au visiteur. On les lance sans bloquer et sans propager d'erreur.
  const alerts = Promise.allSettled([
    notifyAll({
      title: `Message de ${message.name}`,
      body: message.message.slice(0, 140),
      url: `/admin/messages/${message.id}`,
      tag: `message-${message.id}`,
    }),
    (async () => {
      const mailbox = atelierMailbox();
      if (!mailbox) return;

      await sendMail({
        to: mailbox,
        replyTo: message.email ?? undefined,
        subject: `Nouveau message — ${message.name}${
          message.subject ? ` (${message.subject})` : ""
        }`,
        text: `${message.name}\n${message.phone}${
          message.email ? ` · ${message.email}` : ""
        }${message.plate ? `\nImmatriculation : ${message.plate}` : ""}\n\n${
          message.message
        }`,
        html: emailLayout({
          title: `Nouveau message de ${escapeHtml(message.name)}`,
          bodyHtml: `
            <p style="margin:0 0 12px;font-size:14px;color:#4a4a4a;">
              ${escapeHtml(message.phone)}${
                message.email ? ` · ${escapeHtml(message.email)}` : ""
              }${message.plate ? ` · ${escapeHtml(message.plate)}` : ""}
            </p>
            <div style="font-size:15px;line-height:1.6;white-space:pre-line;padding:14px;background:#fafafa;border-radius:10px;border:1px solid #e4e4e7;">${escapeHtml(
              message.message,
            )}</div>`,
          footer: "Répondez depuis le backoffice : /admin/messages",
        }),
      });
    })(),
  ]);

  // On attend brièvement pour que l'envoi parte avant la fin du contexte
  // serverless, sans pénaliser le visiteur si le SMTP traîne.
  await Promise.race([alerts, new Promise((resolve) => setTimeout(resolve, 3000))]);

  return NextResponse.json({ ok: true }, { status: 201 });
}
