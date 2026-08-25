import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { notifyAll } from "@/lib/push";

/** Envoi d'une notification de test depuis le backoffice. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const result = await notifyAll({
    title: "Asphalte — test",
    body: "Les notifications fonctionnent sur cet appareil.",
    url: "/admin/messages",
    tag: "test",
  });

  return NextResponse.json(result);
}
