import {
  Card,
  Field,
  FileInput,
  Flash,
  Input,
  LinkButton,
  PageHeader,
  Textarea,
  buttonClass,
  buttonGhostClass,
} from "@/components/ui";
import {
  resetSiteContentAction,
  saveSiteContentAction,
  uploadHeroImageAction,
} from "@/lib/actions/content";
import {
  SITE_CONTENT_KEYS,
  SITE_CONTENT_LABELS,
  getSiteContent,
  type SiteContentKey,
} from "@/lib/site-content";

export const dynamic = "force-dynamic";

export const metadata = { title: "Page publique" };

const GROUPS: { title: string; prefix: string; hint?: string }[] = [
  { title: "Bandeau d'accueil", prefix: "hero." },
  { title: "À propos de l'atelier", prefix: "about." },
  {
    title: "Prestations",
    prefix: "services.",
    hint: "La liste est au format JSON : [{\"title\":\"…\",\"text\":\"…\"}]",
  },
  {
    title: "Infos pratiques",
    prefix: "info.",
    hint: "Les horaires sont au format JSON : [{\"day\":\"…\",\"hours\":\"…\"}]",
  },
  { title: "Widget de contact", prefix: "contact." },
];

const LONG_FIELDS = new Set<SiteContentKey>([
  "hero.subtitle",
  "about.text",
  "services.items",
  "info.hours",
  "contact.text",
  "contact.success",
]);

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const content = await getSiteContent();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Page publique"
        subtitle="Textes et photo affichés sur asphalte.walautao.fr"
        action={<LinkButton href="/">Voir le site</LinkButton>}
      />

      <Flash error={error} ok={ok} />

      <Card title="Photo du garage">
        <div className="grid gap-4 sm:grid-cols-2">
          <img
            src={content["hero.image"]}
            alt={content["hero.imageAlt"]}
            className="aspect-[4/3] w-full rounded-lg border border-slate-200 object-cover"
          />
          <form action={uploadHeroImageAction} className="space-y-3">
            <Field label="Remplacer la photo" hint="Photo redimensionnée automatiquement — 25 Mo maximum">
              <FileInput name="photo" required />
            </Field>
            <Field label="Description de la photo">
              <Input name="alt" defaultValue={content["hero.imageAlt"]} />
            </Field>
            <button type="submit" className={buttonClass}>
              Mettre en ligne
            </button>
          </form>
        </div>
      </Card>

      <form action={saveSiteContentAction} className="space-y-4">
        {GROUPS.map((group) => {
          const keys = SITE_CONTENT_KEYS.filter((key) => key.startsWith(group.prefix));
          return (
            <Card key={group.prefix} title={group.title}>
              {group.hint ? (
                <p className="mb-3 text-xs text-slate-400">{group.hint}</p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                {keys.map((key) => (
                  <Field
                    key={key}
                    label={SITE_CONTENT_LABELS[key]}
                    className={LONG_FIELDS.has(key) ? "sm:col-span-2" : ""}
                  >
                    {LONG_FIELDS.has(key) ? (
                      <Textarea
                        name={key}
                        rows={key === "services.items" ? 8 : 3}
                        defaultValue={content[key]}
                      />
                    ) : (
                      <Input name={key} defaultValue={content[key]} />
                    )}
                  </Field>
                ))}
              </div>
            </Card>
          );
        })}

        <div className="flex flex-wrap gap-2">
          <button type="submit" className={buttonClass}>
            Publier les modifications
          </button>
          <button
            type="submit"
            formAction={resetSiteContentAction}
            className={buttonGhostClass}
          >
            Réinitialiser aux textes par défaut
          </button>
        </div>
      </form>
    </div>
  );
}
