import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Badge,
  Card,
  DataRow,
  Empty,
  Field,
  Flash,
  Input,
  LinkButton,
  PageHeader,
  Select,
  Textarea,
  buttonClass,
  buttonDangerClass,
} from "@/components/ui";
import { createVehicleAction, deleteVehicleAction } from "@/lib/actions/clients";
import { createInterventionAction } from "@/lib/actions/interventions";
import { createSaleAction } from "@/lib/actions/sales";
import { prisma } from "@/lib/db";
import {
  formatDate,
  formatPlate,
  formatPrice,
  fullName,
  telHref,
  toNumber,
} from "@/lib/format";
import {
  INTERVENTION_STATUS_TONES,
  INTERVENTION_STATUSES,
  INTERVENTION_TYPES,
  options,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;

  const [client, products] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        vehicles: { orderBy: { createdAt: "asc" } },
        interventions: {
          include: { vehicle: true, lines: true },
          orderBy: { createdAt: "desc" },
        },
        sales: {
          include: { lines: { include: { product: true } } },
          orderBy: { soldAt: "desc" },
        },
      },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true, salePrice: true, stockQty: true },
    }),
  ]);

  if (!client) notFound();

  const interventionsTotal = client.interventions.reduce(
    (sum, item) => sum + toNumber(item.totalAmount),
    0,
  );
  const salesTotal = client.sales.reduce(
    (sum, sale) => sum + toNumber(sale.totalAmount),
    0,
  );
  const lastVisit = client.interventions[0]?.createdAt ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={fullName(client)}
        subtitle={`Vue 360 · client depuis ${formatDate(client.createdAt)}`}
        action={
          <div className="flex gap-2">
            <a href={telHref(client.phone)} className={buttonClass}>
              Appeler
            </a>
            <LinkButton href={`/admin/clients/${id}/modifier`}>Modifier</LinkButton>
          </div>
        }
      />

      <Flash error={error} ok={ok} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary label="Véhicules" value={String(client.vehicles.length)} />
        <Summary label="Interventions" value={String(client.interventions.length)} />
        <Summary label="Total atelier" value={formatPrice(interventionsTotal)} />
        <Summary label="Total accessoires" value={formatPrice(salesTotal)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Coordonnées">
          <dl>
            <DataRow label="Téléphone" value={client.phone} />
            {client.phone2 ? <DataRow label="Autre tél." value={client.phone2} /> : null}
            {client.email ? <DataRow label="E-mail" value={client.email} /> : null}
            {client.company ? <DataRow label="Société" value={client.company} /> : null}
            <DataRow
              label="Adresse"
              value={
                client.address
                  ? `${client.address}, ${client.postalCode ?? ""} ${client.city ?? ""}`
                  : "—"
              }
            />
            <DataRow label="Dernier passage" value={formatDate(lastVisit)} />
          </dl>
          {client.notes ? (
            <p className="mt-3 rounded-lg border border-ink-800 bg-ink-950/60 p-3 text-sm text-ink-300">
              {client.notes}
            </p>
          ) : null}
        </Card>

        <Card title="Véhicules" className="lg:col-span-2">
          {client.vehicles.length === 0 ? (
            <Empty>Aucun véhicule enregistré.</Empty>
          ) : (
            <ul className="divide-y divide-ink-800">
              {client.vehicles.map((vehicle) => (
                <li
                  key={vehicle.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-100">
                      {vehicle.brand} {vehicle.model}
                      {vehicle.displacement ? ` · ${vehicle.displacement} cm³` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {vehicle.year ? `${vehicle.year} · ` : ""}
                      {vehicle.color ? `${vehicle.color} · ` : ""}
                      {vehicle.mileage ? `${vehicle.mileage.toLocaleString("fr-FR")} km` : "km inconnu"}
                      {vehicle.vin ? ` · VIN ${vehicle.vin}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="gold">{formatPlate(vehicle.plate)}</Badge>
                    <form action={deleteVehicleAction}>
                      <input type="hidden" name="id" value={vehicle.id} />
                      <input type="hidden" name="clientId" value={id} />
                      <button type="submit" className={buttonDangerClass}>
                        Supprimer
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <details className="mt-4 rounded-lg border border-ink-800 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-gold-300">
              Ajouter un véhicule
            </summary>
            <form action={createVehicleAction} className="mt-4 space-y-3">
              <input type="hidden" name="clientId" value={id} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Immatriculation">
                  <Input name="plate" required placeholder="AB-123-CD" autoCapitalize="characters" />
                </Field>
                <Field label="Marque">
                  <Input name="brand" required placeholder="Yamaha" />
                </Field>
                <Field label="Modèle">
                  <Input name="model" required placeholder="MT-07" />
                </Field>
                <Field label="Année">
                  <Input name="year" type="number" inputMode="numeric" min={1900} max={2100} />
                </Field>
                <Field label="Cylindrée (cm³)">
                  <Input name="displacement" type="number" inputMode="numeric" min={0} />
                </Field>
                <Field label="Kilométrage">
                  <Input name="mileage" type="number" inputMode="numeric" min={0} />
                </Field>
                <Field label="Couleur">
                  <Input name="color" />
                </Field>
                <Field label="VIN" className="sm:col-span-2">
                  <Input name="vin" autoCapitalize="characters" />
                </Field>
                <Field label="Notes" className="sm:col-span-3">
                  <Textarea name="notes" rows={2} />
                </Field>
              </div>
              <button type="submit" className={buttonClass}>
                Ajouter
              </button>
            </form>
          </details>
        </Card>
      </div>

      <Card title="Historique des dépannages et interventions">
        {client.interventions.length === 0 ? (
          <Empty>Aucune intervention pour ce client.</Empty>
        ) : (
          <ul className="divide-y divide-ink-800">
            {client.interventions.map((intervention) => (
              <li key={intervention.id}>
                <Link
                  href={`/admin/interventions/${intervention.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 hover:text-gold-300"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-100">
                      {intervention.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-400">
                      {intervention.reference} · {INTERVENTION_TYPES[intervention.type]} ·{" "}
                      {formatDate(intervention.createdAt)}
                      {intervention.vehicle
                        ? ` · ${intervention.vehicle.brand} ${intervention.vehicle.model} (${formatPlate(intervention.vehicle.plate)})`
                        : ""}
                      {intervention.lines.length > 0
                        ? ` · ${intervention.lines.length} pièce(s)`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gold-300">
                      {formatPrice(intervention.totalAmount)}
                    </span>
                    <Badge tone={INTERVENTION_STATUS_TONES[intervention.status]}>
                      {INTERVENTION_STATUSES[intervention.status]}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-4 rounded-lg border border-ink-800 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-gold-300">
            Nouvelle intervention
          </summary>
          <form action={createInterventionAction} className="mt-4 space-y-3">
            <input type="hidden" name="clientId" value={id} />
            <input type="hidden" name="origin" value={`/admin/clients/${id}`} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Intitulé" className="sm:col-span-2">
                <Input name="title" required placeholder="Panne d'allumage — remorquage" />
              </Field>
              <Field label="Type">
                <Select name="type" defaultValue="DEPANNAGE">
                  {options(INTERVENTION_TYPES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Véhicule">
                <Select name="vehicleId" defaultValue="">
                  <option value="">— Aucun —</option>
                  {client.vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {formatPlate(vehicle.plate)} — {vehicle.brand} {vehicle.model}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Lieu de prise en charge">
                <Input name="pickupLocation" placeholder="Pont de Sèvres" />
              </Field>
              <Field label="Lieu de restitution">
                <Input name="dropoffLocation" placeholder="Atelier" />
              </Field>
              <Field label="Heures de main-d'œuvre">
                <Input name="laborHours" type="number" step="0.25" min={0} defaultValue={0} />
              </Field>
              <Field label="Taux horaire (€)">
                <Input name="laborRate" type="number" step="0.01" min={0} defaultValue={70} />
              </Field>
              <Field label="Kilométrage">
                <Input name="mileage" type="number" inputMode="numeric" min={0} />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <Textarea name="description" rows={3} />
              </Field>
            </div>
            <button type="submit" className={buttonClass}>
              Créer l&apos;intervention
            </button>
          </form>
        </details>
      </Card>

      <Card title="Accessoires et produits achetés">
        {client.sales.length === 0 ? (
          <Empty>Aucun achat au comptoir.</Empty>
        ) : (
          <ul className="divide-y divide-ink-800">
            {client.sales.map((sale) => (
              <li key={sale.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink-100">
                    {sale.reference}
                    <span className="ml-2 text-xs text-ink-500">
                      {formatDate(sale.soldAt)}
                    </span>
                  </p>
                  <span className="text-sm font-semibold text-gold-300">
                    {formatPrice(sale.totalAmount)}
                  </span>
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {sale.lines.map((line) => (
                    <li key={line.id} className="text-xs text-ink-400">
                      {toNumber(line.quantity)} × {line.label}
                      {line.product ? ` (${line.product.sku})` : ""} —{" "}
                      {formatPrice(line.unitPrice)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-4 rounded-lg border border-ink-800 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-gold-300">
            Enregistrer une vente
          </summary>
          <form action={createSaleAction} className="mt-4 space-y-3">
            <input type="hidden" name="clientId" value={id} />
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Produit" className="sm:col-span-2">
                <Select name="productId" required defaultValue="">
                  <option value="" disabled>
                    — Choisir —
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku}) — {product.stockQty} en stock
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Quantité">
                <Input name="quantity" type="number" min={1} defaultValue={1} />
              </Field>
              <Field label="Prix unitaire (€)" hint="Vide = prix catalogue">
                <Input name="unitPrice" type="number" step="0.01" min={0} />
              </Field>
              <Field label="Note" className="sm:col-span-4">
                <Input name="notes" />
              </Field>
            </div>
            <button type="submit" className={buttonClass}>
              Enregistrer la vente
            </button>
          </form>
        </details>
      </Card>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-ink-800 bg-ink-900/60 px-4 py-3">
      <p className="text-[11px] tracking-[0.14em] text-ink-400 uppercase">{label}</p>
      <p className="mt-1 text-xl font-bold text-gold-300">{value}</p>
    </div>
  );
}
