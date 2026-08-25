import { telHref } from "@/lib/format";
import {
  parseJsonList,
  type OpeningHours,
  type SiteContentMap,
} from "@/lib/site-content";

export function PracticalInfo({ content }: { content: SiteContentMap }) {
  const hours = parseJsonList<OpeningHours>(content["info.hours"], []);

  return (
    <section id="infos" className="mx-auto max-w-5xl px-4 py-12">
      <h2 className="text-2xl font-bold tracking-tight text-ink-50 sm:text-3xl">
        {content["info.title"]}
      </h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-ink-800 bg-ink-900/70 p-5">
          <h3 className="text-sm tracking-[0.16em] text-ink-400 uppercase">
            Adresse
          </h3>
          <address className="mt-2 text-base leading-relaxed text-ink-100 not-italic">
            {content["info.address"]}
            <br />
            {content["info.postalCode"]} {content["info.city"]}
          </address>
          <a
            href={content["info.mapsUrl"]}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex rounded-lg border border-gold-500/40 px-4 py-2 text-sm font-semibold text-gold-300 hover:bg-gold-500/10"
          >
            Itinéraire
          </a>
        </div>

        <div className="rounded-card border border-ink-800 bg-ink-900/70 p-5">
          <h3 className="text-sm tracking-[0.16em] text-ink-400 uppercase">
            Contact
          </h3>
          <a
            href={telHref(content["info.phone"])}
            className="text-gilded mt-2 block font-mono text-2xl font-bold"
          >
            {content["info.phone"]}
          </a>
          {content["info.email"] ? (
            <a
              href={`mailto:${content["info.email"]}`}
              className="mt-2 block text-sm text-ink-200 underline decoration-gold-500/50 underline-offset-4"
            >
              {content["info.email"]}
            </a>
          ) : null}

          {hours.length > 0 ? (
            <dl className="mt-5 space-y-1.5 border-t border-ink-800 pt-4 text-sm">
              {hours.map((slot) => (
                <div key={slot.day} className="flex justify-between gap-3">
                  <dt className="text-ink-300">{slot.day}</dt>
                  <dd className="text-ink-100">{slot.hours}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </section>
  );
}
