import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { normalizePlate } from "@/lib/format";

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

  try {
    await prisma.contactMessage.create({
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

  return NextResponse.json({ ok: true }, { status: 201 });
}
