import {
  parseJsonList,
  type ServiceItem,
  type SiteContentMap,
} from "@/lib/site-content";

export function Services({ content }: { content: SiteContentMap }) {
  const items = parseJsonList<ServiceItem>(content["services.items"], []);
  if (items.length === 0) return null;

  return (
    <section id="prestations" className="mx-auto max-w-5xl px-4 py-12">
      <h2 className="text-2xl font-bold tracking-tight text-ink-50 sm:text-3xl">
        {content["services.title"]}
      </h2>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li
            key={item.title}
            className="rounded-card border border-ink-800 bg-ink-900/70 p-5 transition-colors hover:border-gold-500/40"
          >
            <h3 className="text-base font-semibold text-gold-300">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-300">
              {item.text}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
