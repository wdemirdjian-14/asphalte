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
import { createReceptionAction } from "@/lib/actions/receptions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Nouveau colis" };

export default async function NewReceptionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouveau colis"
        subtitle="Étape 1 : l'entête. Vous saisirez ensuite le contenu ligne par ligne."
        action={<LinkButton href="/admin/receptions">Annuler</LinkButton>}
      />

      <form action={createReceptionAction} className="space-y-4">
        <Flash error={error} />
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fournisseur connu">
              <Select name="supplierId" defaultValue="">
                <option value="">— Aucun / nouveau —</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nouveau fournisseur" hint="Créé s'il n'existe pas encore">
              <Input name="supplierName" placeholder="Moto Parts Diffusion" />
            </Field>
            <Field label="Transporteur">
              <Input name="carrier" placeholder="Chronopost, DPD, Colissimo…" />
            </Field>
            <Field label="Numéro de suivi">
              <Input name="trackingNumber" autoCapitalize="characters" />
            </Field>
            <Field label="Numéro de facture / BL">
              <Input name="invoiceNumber" />
            </Field>
            <Field label="Nombre de colis">
              <Input name="packageCount" type="number" min={1} defaultValue={1} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea name="notes" rows={2} placeholder="Carton abîmé, à contrôler…" />
            </Field>
          </div>
        </Card>
        <button type="submit" className={buttonClass}>
          Créer et saisir le contenu
        </button>
      </form>
    </div>
  );
}
