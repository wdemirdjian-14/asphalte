import Link from "next/link";
import { redirect } from "next/navigation";

import { Alert, Field, Input, buttonClass } from "@/components/ui";
import { loginAction } from "@/lib/actions/auth";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  if (await getSessionUser()) redirect("/admin");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/images/logo.svg"
            alt="Asphalte"
            width={72}
            height={72}
            className="mx-auto h-18 w-18 rounded-xl"
          />
          <h1 className="text-gilded-ink mt-4 text-3xl font-bold">Espace atelier</h1>
          <p className="mt-1 text-sm text-slate-500">
            Réservé à l&apos;équipe Asphalte
          </p>
        </div>

        <form
          action={loginAction}
          className="space-y-4 rounded-card border border-slate-200 bg-white p-6 shadow-sm"
        >
          {error ? <Alert>{error}</Alert> : null}

          <input type="hidden" name="next" value={next ?? "/admin"} />

          <Field label="E-mail">
            <Input
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="contact@asphalte.fr"
            />
          </Field>

          <Field label="Mot de passe">
            <Input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </Field>

          <button type="submit" className={`${buttonClass} w-full`}>
            Se connecter
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 block text-center text-sm text-slate-500 underline underline-offset-4 hover:text-slate-900"
        >
          Retour au site
        </Link>
      </div>
    </main>
  );
}
