import { notFound } from "next/navigation";

import { ClientFormFields } from "@/components/admin/ClientFormFields";
import { Card, Flash, LinkButton, PageHeader, buttonClass } from "@/components/ui";
import { updateClientAction } from "@/lib/actions/clients";
import { prisma } from "@/lib/db";
import { fullName } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Modifier ${fullName(client)}`}
        action={<LinkButton href={`/admin/clients/${id}`}>Annuler</LinkButton>}
      />

      <form action={updateClientAction} className="space-y-4">
        <input type="hidden" name="id" value={id} />
        <Flash error={error} />
        <Card>
          <ClientFormFields client={client} />
        </Card>
        <button type="submit" className={buttonClass}>
          Enregistrer
        </button>
      </form>
    </div>
  );
}
