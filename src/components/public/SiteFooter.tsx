import Link from "next/link";

import type { SiteContentMap } from "@/lib/site-content";

export function SiteFooter({ content }: { content: SiteContentMap }) {
  return (
    <footer className="border-t border-ink-800 bg-ink-950">
      {/* Marge basse : la barre d'action mobile est fixée au-dessus */}
      <div className="mx-auto max-w-5xl px-4 py-10 pb-28 sm:pb-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-gilded text-xl font-bold">Asphalte</p>
            <p className="mt-1 text-xs text-ink-400">
              {content["info.address"]}, {content["info.postalCode"]}{" "}
              {content["info.city"]}
            </p>
          </div>
          <Link
            href="/admin"
            className="text-xs text-ink-400 underline underline-offset-4 hover:text-gold-400"
          >
            Espace atelier
          </Link>
        </div>
        <p className="mt-6 text-xs text-ink-500">
          © {new Date().getFullYear()} Asphalte — Réparation de motocyclettes
          depuis {content["about.since"]}.
        </p>
      </div>
    </footer>
  );
}
