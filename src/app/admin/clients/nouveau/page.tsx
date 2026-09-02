import { ClientFormFields } from "@/components/admin/ClientFormFields";
import { VehicleFieldset } from "@/components/admin/VehicleFieldset";
import { Card, Flash, LinkButton, PageHeader, buttonClass } from "@/components/ui";
import { createClientAction } from "@/lib/actions/clients";

export const dynamic = "force-dynamic";

export const metadata = { title: "Nouveau client" };

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouveau client"
        subtitle="Coordonnées et véhicules en une seule saisie"
        action={<LinkButton href="/admin/clients">Annuler</LinkButton>}
      />

      <form action={createClientAction} className="space-y-4">
        <Flash error={error} />

        <Card title="Coordonnées">
          <ClientFormFields />
        </Card>

        <Card title="Véhicules">
          <p className="mb-4 text-sm text-slate-600">
            Renseignez au moins l&apos;immatriculation, la marque et le modèle.
            Laissez vide si le client n&apos;a pas encore de véhicule — vous
            pourrez en ajouter depuis sa fiche.
          </p>

          <div className="space-y-4">
            <VehicleFieldset index={1} />

            <details className="rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                Ajouter un deuxième véhicule
              </summary>
              <div className="mt-4 space-y-4">
                <VehicleFieldset index={2} />

                <details className="rounded-lg border border-slate-200 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                    Ajouter un troisième véhicule
                  </summary>
                  <div className="mt-4">
                    <VehicleFieldset index={3} />
                  </div>
                </details>
              </div>
            </details>
          </div>
        </Card>

        <button type="submit" className={buttonClass}>
          Créer la fiche
        </button>
      </form>
    </div>
  );
}
