import {
  Card,
  Field,
  FileInput,
  Flash,
  Input,
  LinkButton,
  PageHeader,
  Select,
  Textarea,
  buttonClass,
} from "@/components/ui";
import { createProductAction } from "@/lib/actions/products";
import { PRODUCT_CATEGORIES, options } from "@/lib/labels";

export const dynamic = "force-dynamic";

export const metadata = { title: "Nouveau produit" };

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouveau produit"
        subtitle="Une photo, un nom, une quantité. C'est tout."
        action={<LinkButton href="/admin/produits">Annuler</LinkButton>}
      />

      <form action={createProductAction} className="space-y-4">
        <Flash error={error} />

        <Card>
          <div className="space-y-4">
            <Field label="Photo du produit" hint="Appareil photo du téléphone accepté">
              <FileInput name="photo" capture="environment" />
            </Field>

            <Field label="Nom">
              <Input
                name="name"
                required
                autoFocus
                placeholder="Plaquettes de frein avant"
              />
            </Field>

            <Field label="Quantité en stock">
              <Input
                name="stockQty"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={0}
                className="text-2xl font-bold"
              />
            </Field>
          </div>
        </Card>

        <details className="rounded-card border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            Détails facultatifs
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Marque">
              <Input name="brand" />
            </Field>
            <Field label="Emplacement" hint="Rayon, bac, étagère">
              <Input name="location" placeholder="R1-A3" />
            </Field>
            <Field label="Catégorie">
              <Select name="category" defaultValue="AUTRE">
                {options(PRODUCT_CATEGORIES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Seuil d'alerte" hint="Prévenir quand le stock descend à ce niveau">
              <Input name="stockAlert" type="number" min={0} defaultValue={0} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea name="notes" rows={2} />
            </Field>
          </div>
        </details>

        <button type="submit" className={buttonClass}>
          Créer le produit
        </button>
      </form>
    </div>
  );
}
