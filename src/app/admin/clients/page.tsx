import Link from "next/link";

import { Badge, Card, Empty, Input, LinkButton, PageHeader, buttonClass } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate, formatPlate, fullName } from "@/lib/format";
import { normalizePlate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const contains = { contains: query, mode: "insensitive" as const };

  const clients = await prisma.client.findMany({
    where: query
      ? {
          OR: [
            { firstName: contains },
            { lastName: contains },
            { company: contains },
            { email: contains },
            { phone: { contains: query } },
            { city: contains },
            { vehicles: { some: { plate: { contains: normalizePlate(query) } } } },
          ],
        }
      : undefined,
    include: {
      vehicles: { orderBy: { createdAt: "asc" } },
      _count: { select: { interventions: true, sales: true } },
    },
    orderBy: { lastName: "asc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} fiche${clients.length > 1 ? "s" : ""} affichée${clients.length > 1 ? "s" : ""}`}
        action={
          <LinkButton href="/admin/clients/nouveau" variant="primary">
            Nouveau client
          </LinkButton>
        }
      />

      <form method="get" className="flex gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Nom, téléphone, plaque, ville…"
          className="flex-1"
        />
        <button type="submit" className={buttonClass}>
          Filtrer
        </button>
      </form>

      {clients.length === 0 ? (
        <Empty>
          Aucun client{query ? ` pour « ${query} »` : ""}.{" "}
          <Link href="/admin/clients/nouveau" className="text-gold-300 underline">
            Créer une fiche
          </Link>
        </Empty>
      ) : (
        <Card>
          <ul className="divide-y divide-ink-800">
            {clients.map((client) => (
              <li key={client.id}>
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-gold-300"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-100">
                      {fullName(client)}
                      {client.company ? (
                        <span className="ml-2 text-xs text-ink-500">
                          {client.company}
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-ink-400">
                      {client.phone}
                      {client.city ? ` · ${client.city}` : ""} · client depuis{" "}
                      {formatDate(client.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {client.vehicles.slice(0, 2).map((vehicle) => (
                      <Badge key={vehicle.id} tone="gold">
                        {formatPlate(vehicle.plate)}
                      </Badge>
                    ))}
                    {client.vehicles.length > 2 ? (
                      <Badge>+{client.vehicles.length - 2}</Badge>
                    ) : null}
                    <Badge>{client._count.interventions} interv.</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
