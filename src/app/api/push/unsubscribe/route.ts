import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ endpoint: z.string().url().max(2000) });

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  await prisma.pushSubscription
    .delete({ where: { endpoint: parsed.data.endpoint } })
    .catch(() => undefined);

  return NextResponse.json({ ok: true });
}
