import type { SiteContentMap } from "@/lib/site-content";

export function About({ content }: { content: SiteContentMap }) {
  const experience = new Date().getFullYear() - Number(content["about.since"]);

  return (
    <section id="atelier" className="border-y border-ink-800 bg-ink-900/40">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-2xl font-bold tracking-tight text-ink-50 sm:text-3xl">
          {content["about.title"]}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-200">
          {content["about.text"]}
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Depuis" value={content["about.since"]} />
          <Stat
            label="D'expérience"
            value={Number.isFinite(experience) ? `${experience} ans` : "—"}
          />
          <Stat
            label="Marques"
            value={content["about.brands"]}
            className="col-span-2 sm:col-span-1"
          />
        </dl>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-card border border-gold-500/20 bg-ink-950/60 px-4 py-4 ${className}`}
    >
      <dt className="text-[11px] tracking-[0.16em] text-ink-400 uppercase">
        {label}
      </dt>
      <dd className="text-gilded mt-1 text-2xl font-bold">{value}</dd>
    </div>
  );
}
