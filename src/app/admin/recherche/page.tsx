import Link from "next/link";

import { Badge, Card, Empty, Input, PageHeader, Select, buttonClass } from "@/components/ui";
import { formatDate, formatPlate, fullName } from "@/lib/format";
import {
  INTERVENTION_STATUS_TONES,
  INTERVENTION_STATUSES,
} from "@/lib/labels";
import { SEARCH_SCOPES, searchAll, type SearchScope } from "@/lib/search";

export const dynamic = "force-dynamic";

export const metadata = { title: "Recherche" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const scope: SearchScope =
    params.scope && params.scope in SEARCH_SCOPES
      ? (params.scope as SearchScope)
      : "tout";

  const results = await searchAll(query, scope);
  const total =
    results.clients.length +
    results.vehicles.length +
    results.interventions.length +
    results.products.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recherche multi-critères"
        subtitle="Plaque, nom, téléphone, marque, modèle, VIN, référence, produit…"
      />

      <form method="get" className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="q"
          defaultValue={query}
          autoFocus
          placeholder="AB-123-CD, Dupont, 06 12…, MT-07, DEP-2026-0001, PLQ-AV"
          className="sm:flex-1"
        />
        <Select name="scope" defaultValue={scope} className="sm:w-48">
          {Object.entries(SEARCH_SCOPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <button type="submit" className={buttonClass}>
          Rechercher
        </button>
      </form>

      {query.trim().length < 2 ? (
        <Empty>Saisissez au moins deux caractères.</Empty>
      ) : total === 0 ? (
        <Empty>Aucun résultat pour « {query} ».</Empty>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {total} résultat{total > 1 ? "s" : ""} pour « {query} »
          </p>

          {results.clients.length > 0 ? (
            <Card title={`Clients (${results.clients.length})`}>
              <ul className="divide-y divide-slate-200">
                {results.clients.map((client) => (
                  <li key={client.id}>
                    <Link
                      href={`/admin/clients/${client.id}`}
                      className="flex items-center justify-between gap-3 py-3 hover:text-gold-700"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {fullName(client)}
                          {client.company ? ` — ${client.company}` : ""}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {client.phone}
                          {client.city ? ` · ${client.city}` : ""}
                        </p>
                      </div>
                      <Badge>
                        {client._count.vehicles} véh. · {client._count.interventions} interv.
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {results.vehicles.length > 0 ? (
            <Card title={`Véhicules (${results.vehicles.length})`}>
              <ul className="divide-y divide-slate-200">
                {results.vehicles.map((vehicle) => (
                  <li key={vehicle.id}>
                    <Link
                      href={`/admin/clients/${vehicle.clientId}`}
                      className="flex items-center justify-between gap-3 py-3 hover:text-gold-700"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {vehicle.brand} {vehicle.model}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {fullName(vehicle.client)}
                          {vehicle.year ? ` · ${vehicle.year}` : ""}
                        </p>
                      </div>
                      <Badge tone="gold">{formatPlate(vehicle.plate)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {results.interventions.length > 0 ? (
            <Card title={`Interventions (${results.interventions.length})`}>
              <ul className="divide-y divide-slate-200">
                {results.interventions.map((intervention) => (
                  <li key={intervention.id}>
                    <Link
                      href={`/admin/interventions/${intervention.id}`}
                      className="flex items-center justify-between gap-3 py-3 hover:text-gold-700"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {intervention.title}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {intervention.reference} · {fullName(intervention.client)} ·{" "}
                          {formatDate(intervention.createdAt)}
                        </p>
                      </div>
                      <Badge tone={INTERVENTION_STATUS_TONES[intervention.status]}>
                        {INTERVENTION_STATUSES[intervention.status]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {results.products.length > 0 ? (
            <Card title={`Produits (${results.products.length})`}>
              <ul className="divide-y divide-slate-200">
                {results.products.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/admin/produits/${product.id}`}
                      className="flex items-center justify-between gap-3 py-3 hover:text-gold-700"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {product.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {product.sku}
                          {product.brand ? ` · ${product.brand}` : ""}
                          {product.location ? ` · ${product.location}` : ""}
                        </p>
                      </div>
                      <Badge tone={product.stockQty <= product.stockAlert ? "gold" : "neutral"}>
                        {product.stockQty} en stock
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
