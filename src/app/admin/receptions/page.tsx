import Link from "next/link";

import { Badge, Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { RECEPTION_STATUSES } from "@/lib/labels";

export const dynamic = "force-dynamic";

export const metadata = { title: "Réceptions de colis" };

export default async function ReceptionsPage() {
  const receptions = await prisma.reception.findMany({
    include: {
      supplier: true,
      receivedBy: { select: { name: true } },
      _count: { select: { lines: true } },
    },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });

  const drafts = receptions.filter((reception) => reception.status === "BROUILLON");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réceptions de colis"
        subtitle="Saisir un colis, puis entrer tout son contenu en stock en une seule validation"
        action={
          <LinkButton href="/admin/receptions/nouvelle" variant="primary">
            Nouveau colis
          </LinkButton>
        }
      />

      {drafts.length > 0 ? (
        <p className="rounded-lg border border-gold-400 bg-gold-50 px-3 py-2 text-sm text-gold-800">
          {drafts.length} colis en attente de validation.
        </p>
      ) : null}

      {receptions.length === 0 ? (
        <Empty>Aucune réception enregistrée.</Empty>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-200">
            {receptions.map((reception) => (
              <li key={reception.id}>
                <Link
                  href={`/admin/receptions/${reception.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 hover:text-gold-700"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {reception.reference}
                      {reception.supplier ? ` — ${reception.supplier.name}` : ""}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {formatDate(reception.receivedAt)} · {reception._count.lines} produit(s)
                      {reception.carrier ? ` · ${reception.carrier}` : ""}
                      {reception.trackingNumber ? ` · ${reception.trackingNumber}` : ""}
                      {reception.receivedBy ? ` · reçu par ${reception.receivedBy.name}` : ""}
                    </p>
                  </div>
                  <Badge tone={reception.status === "VALIDE" ? "green" : "gold"}>
                    {RECEPTION_STATUSES[reception.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
