"use server";

import { redirect } from "next/navigation";

import { authenticate, createSession, destroySession } from "@/lib/auth";
import { failWith, text } from "@/lib/form";

export async function loginAction(formData: FormData): Promise<void> {
  const email = text(formData, "email");
  const password = text(formData, "password");
  const next = text(formData, "next") || "/admin";

  if (!email || !password) {
    failWith("/login", "Renseignez votre e-mail et votre mot de passe.");
  }

  let user;
  try {
    user = await authenticate(email, password);
  } catch {
    failWith("/login", "Connexion impossible : base de données injoignable.");
  }

  if (!user) {
    failWith("/login", "E-mail ou mot de passe incorrect.");
  }

  await createSession(user);
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
