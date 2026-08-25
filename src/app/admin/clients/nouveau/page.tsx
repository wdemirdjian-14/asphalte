import { ClientFormFields } from "@/components/admin/ClientFormFields";
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
        action={<LinkButton href="/admin/clients">Annuler</LinkButton>}
      />

      <form action={createClientAction} className="space-y-4">
        <Flash error={error} />
        <Card>
          <ClientFormFields />
        </Card>
        <button type="submit" className={buttonClass}>
          Créer la fiche
        </button>
      </form>
    </div>
  );
}
