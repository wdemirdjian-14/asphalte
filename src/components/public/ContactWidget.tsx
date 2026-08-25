"use client";

import { useEffect, useId, useState } from "react";

import { telHref } from "@/lib/format";
import type { SiteContentMap } from "@/lib/site-content";

type Status = "idle" | "sending" | "sent" | "error";

const SUBJECTS = [
  "Dépannage",
  "Réparation",
  "Entretien / révision",
  "Pièce ou accessoire",
  "Autre demande",
];

export function ContactWidget({ content }: { content: SiteContentMap }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const formId = useId();

  // Pas de scroll de la page derrière la feuille ouverte
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    const payload = Object.fromEntries(new FormData(event.currentTarget));

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? "L'envoi a échoué. Réessayez ou appelez-nous.");
        setStatus("error");
        return;
      }

      setStatus("sent");
    } catch {
      setError("Connexion impossible. Réessayez ou appelez-nous.");
      setStatus("error");
    }
  }

  return (
    <>
      {/* Bloc d'appel à l'action dans le flux de la page */}
      <section id="contact" className="mx-auto max-w-5xl scroll-mt-20 px-4 pb-12">
        <div className="rounded-card border border-gold-500/30 bg-gradient-to-b from-ink-900 to-ink-950 p-6">
          <h2 className="text-2xl font-bold tracking-tight text-ink-50">
            {content["contact.title"]}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            {content["contact.text"]}
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-5 w-full rounded-xl bg-gold-500 px-5 py-3.5 text-base font-semibold text-ink-950 transition-colors hover:bg-gold-400 sm:w-auto"
          >
            Envoyer un message
          </button>
        </div>
      </section>

      {/* Barre d'action fixe — mobile first */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold-500/25 bg-ink-950/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
        <div className="flex gap-2">
          <a
            href={telHref(content["info.phone"])}
            className="flex flex-1 items-center justify-center rounded-xl bg-gold-500 px-4 py-3 text-sm font-semibold text-ink-950"
          >
            Appeler l&apos;atelier
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-1 items-center justify-center rounded-xl border border-gold-500/40 px-4 py-3 text-sm font-semibold text-gold-300"
          >
            Message
          </button>
        </div>
      </div>

      {/* Bouton flottant — écrans larges */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Envoyer un message à l'atelier"
        className="fixed right-6 bottom-6 z-40 hidden h-14 items-center gap-2 rounded-full bg-gold-500 px-5 text-sm font-semibold text-ink-950 shadow-xl shadow-black/50 transition-colors hover:bg-gold-400 sm:flex"
      >
        Nous écrire
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formId}-title`}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border-t border-gold-500/30 bg-ink-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-2xl sm:border">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-600 sm:hidden" />

            <div className="flex items-start justify-between gap-4">
              <h2
                id={`${formId}-title`}
                className="text-lg font-bold text-ink-50"
              >
                {status === "sent" ? "C'est envoyé" : content["contact.title"]}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-mt-1 rounded-lg px-2 py-1 text-2xl leading-none text-ink-400 hover:text-ink-100"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            {status === "sent" ? (
              <div className="py-6">
                <p className="text-sm leading-relaxed text-ink-200">
                  {content["contact.success"]}
                </p>
                <a
                  href={telHref(content["info.phone"])}
                  className="mt-5 block rounded-xl bg-gold-500 px-4 py-3 text-center text-sm font-semibold text-ink-950"
                >
                  Appeler maintenant — {content["info.phone"]}
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-2 w-full rounded-xl border border-ink-700 px-4 py-3 text-sm text-ink-300"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <p className="text-xs leading-relaxed text-ink-400">
                  {content["contact.text"]}
                </p>

                <Field label="Votre nom" name="name" required autoComplete="name" />
                <Field
                  label="Téléphone"
                  name="phone"
                  type="tel"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                />
                <Field
                  label="E-mail (optionnel)"
                  name="email"
                  type="email"
                  autoComplete="email"
                />
                <Field
                  label="Immatriculation (optionnel)"
                  name="plate"
                  placeholder="AB-123-CD"
                  autoCapitalize="characters"
                />

                <label className="block">
                  <span className="text-xs tracking-wide text-ink-400 uppercase">
                    Motif
                  </span>
                  <select
                    name="subject"
                    defaultValue={SUBJECTS[0]}
                    className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-3 text-base text-ink-50 focus:border-gold-500 focus:outline-none"
                  >
                    {SUBJECTS.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs tracking-wide text-ink-400 uppercase">
                    Votre message
                  </span>
                  <textarea
                    name="message"
                    required
                    rows={4}
                    minLength={5}
                    placeholder="Décrivez la panne, le modèle, le lieu si vous êtes immobilisé…"
                    className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-3 text-base text-ink-50 placeholder:text-ink-500 focus:border-gold-500 focus:outline-none"
                  />
                </label>

                {/* Piège à robots : invisible pour les visiteurs */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                />

                {error ? (
                  <p className="rounded-lg border border-brake-500/40 bg-brake-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full rounded-xl bg-gold-500 px-4 py-3.5 text-base font-semibold text-ink-950 transition-colors hover:bg-gold-400 disabled:opacity-60"
                >
                  {status === "sending" ? "Envoi…" : "Envoyer"}
                </button>

                <a
                  href={telHref(content["info.phone"])}
                  className="block py-1 text-center text-sm text-ink-400"
                >
                  ou appeler le {content["info.phone"]}
                </a>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs tracking-wide text-ink-400 uppercase">
        {label}
      </span>
      <input
        name={name}
        {...props}
        className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-3 text-base text-ink-50 placeholder:text-ink-500 focus:border-gold-500 focus:outline-none"
      />
    </label>
  );
}
