import {
  Card,
  Field,
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
        subtitle="Pièce, accessoire, pneu, consommable…"
        action={<LinkButton href="/admin/produits">Annuler</LinkButton>}
      />

      <form action={createProductAction} className="space-y-4">
        <Flash error={error} />
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Référence (SKU)">
              <Input name="sku" required placeholder="PLQ-AV-STD" autoCapitalize="characters" />
            </Field>
            <Field label="Nom">
              <Input name="name" required placeholder="Plaquettes de frein avant" />
            </Field>
            <Field label="Catégorie">
              <Select name="category" defaultValue="PIECE">
                {options(PRODUCT_CATEGORIES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Marque">
              <Input name="brand" />
            </Field>
            <Field label="Code-barres">
              <Input name="barcode" inputMode="numeric" />
            </Field>
            <Field label="Emplacement" hint="Rayon, bac, étagère">
              <Input name="location" placeholder="R1-A3" />
            </Field>
            <Field label="Prix d'achat HT (€)">
              <Input name="purchasePrice" type="number" step="0.01" min={0} defaultValue={0} />
            </Field>
            <Field label="Prix de vente TTC (€)">
              <Input name="salePrice" type="number" step="0.01" min={0} defaultValue={0} />
            </Field>
            <Field label="TVA (%)">
              <Input name="vatRate" type="number" step="0.1" min={0} defaultValue={20} />
            </Field>
            <Field label="Seuil d'alerte">
              <Input name="stockAlert" type="number" min={0} defaultValue={0} />
            </Field>
            <Field label="Stock initial" hint="Enregistré comme mouvement d'inventaire">
              <Input name="stockQty" type="number" min={0} defaultValue={0} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea name="description" rows={3} />
            </Field>
          </div>
        </Card>
        <button type="submit" className={buttonClass}>
          Créer le produit
        </button>
      </form>
    </div>
  );
}
