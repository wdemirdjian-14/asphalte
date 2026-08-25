import { telHref } from "@/lib/format";
import type { SiteContentMap } from "@/lib/site-content";

export function Hero({ content }: { content: SiteContentMap }) {
  return (
    <section className="bg-asphalt relative overflow-hidden">
      <div className="mx-auto max-w-5xl px-4 pt-10 pb-8 sm:pt-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-medium tracking-wide text-gold-300 uppercase">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-400" />
          {content["hero.badge"]}
        </p>

        <h1 className="text-gilded mt-5 text-5xl leading-[1.05] font-bold tracking-tight sm:text-7xl">
          {content["hero.title"]}
        </h1>
        <p className="mt-2 text-sm tracking-[0.18em] text-ink-200 uppercase sm:text-base">
          {content["hero.tagline"]}
        </p>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-200 sm:text-lg">
          {content["hero.subtitle"]}
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <a
            href={telHref(content["info.phone"])}
            className="flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-3.5 text-base font-semibold text-ink-950 shadow-lg shadow-gold-500/20 transition-colors hover:bg-gold-400"
          >
            {content["hero.ctaPrimary"]}
            <span className="font-mono text-sm opacity-80">
              {content["info.phone"]}
            </span>
          </a>
          <a
            href="#contact"
            className="flex items-center justify-center rounded-xl border border-gold-500/40 px-5 py-3.5 text-base font-semibold text-gold-300 transition-colors hover:bg-gold-500/10"
          >
            {content["hero.ctaSecondary"]}
          </a>
        </div>

        {/* Photo du garage */}
        <figure className="mt-9 overflow-hidden rounded-2xl border border-gold-500/25 bg-ink-900 shadow-2xl shadow-black/60">
          <img
            src={content["hero.image"]}
            alt={content["hero.imageAlt"]}
            className="aspect-[4/3] w-full object-cover sm:aspect-[3/2]"
          />
          <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-800 px-4 py-3 text-xs text-ink-300">
            <span>
              {content["info.address"]} — {content["info.postalCode"]}{" "}
              {content["info.city"]}
            </span>
            <span className="text-gold-400">
              {content["about.brands"]} · depuis {content["about.since"]}
            </span>
          </figcaption>
        </figure>
      </div>
      <div className="road-divider" />
    </section>
  );
}
