import Link from "next/link";

import { Badge, Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate, formatPlate, fullName } from "@/lib/format";
import {
  INTERVENTION_STATUS_TONES,
  INTERVENTION_STATUSES,
  INTERVENTION_TYPES,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tableau de bord" };

export default async function AdminDashboard() {
  const [
    clientCount,
    vehicleCount,
    openInterventions,
    newMessages,
    draftReceptions,
    lowStock,
    recentInterventions,
    recentMessages,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.vehicle.count(),
    prisma.intervention.count({ where: { status: { in: ["OUVERT", "EN_COURS"] } } }),
    prisma.contactMessage.count({ where: { status: "NOUVEAU" } }),
    prisma.reception.count({ where: { status: "BROUILLON" } }),
    prisma.$queryRaw<{ id: string; name: string; sku: string; stockQty: number; stockAlert: number }[]>`
      SELECT id, name, sku, "stockQty", "stockAlert"
      FROM "Product"
      WHERE active = true AND "stockQty" <= "stockAlert"
      ORDER BY "stockQty" ASC
      LIMIT 8
    `,
    prisma.intervention.findMany({
      include: { client: true, vehicle: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.contactMessage.findMany({
      where: { status: "NOUVEAU" },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        subtitle="L'activité de l'atelier en un coup d'œil"
        action={<LinkButton href="/admin/recherche" variant="primary">Recherche</LinkButton>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Clients" value={clientCount} href="/admin/clients" />
        <Stat label="Véhicules" value={vehicleCount} href="/admin/clients" />
        <Stat label="En cours" value={openInterventions} href="/admin/interventions" />
        <Stat label="Colis à valider" value={draftReceptions} href="/admin/receptions" />
        <Stat
          label="Messages"
          value={newMessages}
          href="/admin/messages"
          highlight={newMessages > 0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Dernières interventions"
          action={
            <Link href="/admin/interventions" className="text-xs text-ink-400 hover:text-gold-300">
              Tout voir
            </Link>
          }
        >
          {recentInterventions.length === 0 ? (
            <Empty>Aucune intervention enregistrée.</Empty>
          ) : (
            <ul className="divide-y divide-ink-800">
              {recentInterventions.map((intervention) => (
                <li key={intervention.id}>
                  <Link
                    href={`/admin/interventions/${intervention.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:text-gold-300"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-100">
                        {intervention.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-400">
                        {intervention.reference} · {fullName(intervention.client)}
                        {intervention.vehicle
                          ? ` · ${formatPlate(intervention.vehicle.plate)}`
                          : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge tone={INTERVENTION_STATUS_TONES[intervention.status]}>
                        {INTERVENTION_STATUSES[intervention.status]}
                      </Badge>
                      <p className="mt-1 text-xs text-ink-500">
                        {INTERVENTION_TYPES[intervention.type]}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card
            title="Stock au plus bas"
            action={
              <Link href="/admin/produits" className="text-xs text-ink-400 hover:text-gold-300">
                Catalogue
              </Link>
            }
          >
            {lowStock.length === 0 ? (
              <Empty>Aucun produit sous son seuil d&apos;alerte.</Empty>
            ) : (
              <ul className="divide-y divide-ink-800">
                {lowStock.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/admin/produits/${product.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 hover:text-gold-300"
                    >
                      <span className="min-w-0 truncate text-sm text-ink-100">
                        {product.name}
                        <span className="ml-2 text-xs text-ink-500">{product.sku}</span>
                      </span>
                      <Badge tone={product.stockQty <= 0 ? "red" : "gold"}>
                        {product.stockQty} / seuil {product.stockAlert}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Messages du site"
            action={
              <Link href="/admin/messages" className="text-xs text-ink-400 hover:text-gold-300">
                Tout voir
              </Link>
            }
          >
            {recentMessages.length === 0 ? (
              <Empty>Aucun nouveau message.</Empty>
            ) : (
              <ul className="divide-y divide-ink-800">
                {recentMessages.map((message) => (
                  <li key={message.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-ink-100">{message.name}</p>
                      <span className="text-xs text-ink-500">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-ink-400">
                      {message.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  highlight = false,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-card border px-4 py-4 transition-colors ${
        highlight
          ? "border-gold-500/50 bg-gold-500/10"
          : "border-ink-800 bg-ink-900/60 hover:border-gold-500/30"
      }`}
    >
      <p className="text-[11px] tracking-[0.14em] text-ink-400 uppercase">{label}</p>
      <p className="text-gilded mt-1 text-3xl font-bold">{value}</p>
    </Link>
  );
}
