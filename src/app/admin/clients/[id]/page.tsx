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
  buttonGoldClass,
} from "@/components/ui";
import { createVehicleAction } from "@/lib/actions/clients";
import { createInterventionAction } from "@/lib/actions/interventions";
import { createSaleAction } from "@/lib/actions/sales";
import { prisma } from "@/lib/db";
import {
  formatDate,
  formatMileage,
  formatPlate,
  fullName,
  telHref,
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
        vehicles: {
          include: { _count: { select: { documents: true, interventions: true } } },
          orderBy: { createdAt: "asc" },
        },
        interventions: {
          include: { vehicle: true, services: true, parts: true },
          orderBy: { createdAt: "desc" },
        },
        sales: {
          include: { lines: true },
          orderBy: { soldAt: "desc" },
        },
      },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, stockQty: true },
    }),
  ]);

  if (!client) notFound();

  const lastVisit = client.interventions[0]?.createdAt ?? null;
  const itemsBought = client.sales.reduce(
    (sum, sale) => sum + sale.lines.reduce((n, line) => n + line.quantity, 0),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={fullName(client)}
        subtitle={`Vue 360 · client depuis ${formatDate(client.createdAt)}`}
        action={
          <div className="flex gap-2">
            <a href={telHref(client.phone)} className={buttonGoldClass}>
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
        <Summary label="Accessoires remis" value={String(itemsBought)} />
        <Summary label="Dernier passage" value={formatDate(lastVisit)} />
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
          </dl>
          {client.notes ? (
            <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              {client.notes}
            </p>
          ) : null}
        </Card>

        <Card title="Véhicules" className="lg:col-span-2">
          {client.vehicles.length === 0 ? (
            <Empty>Aucun véhicule enregistré.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {client.vehicles.map((vehicle) => (
                <li key={vehicle.id}>
                  <Link
                    href={`/admin/vehicules/${vehicle.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 hover:text-gold-700"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {vehicle.brand} {vehicle.model}
                        {vehicle.displacement ? ` · ${vehicle.displacement} cm³` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {vehicle.year ? `${vehicle.year} · ` : ""}
                        {vehicle.color ? `${vehicle.color} · ` : ""}
                        {formatMileage(vehicle.mileage)} ·{" "}
                        {vehicle._count.interventions} intervention(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {vehicle._count.documents === 0 ? (
                        <Badge tone="gold">Carte grise manquante</Badge>
                      ) : (
                        <Badge tone="green">
                          {vehicle._count.documents} document(s)
                        </Badge>
                      )}
                      <Badge>{formatPlate(vehicle.plate)}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
              Ajouter un véhicule
            </summary>
            <form action={createVehicleAction} className="mt-4 space-y-3">
              <input type="hidden" name="clientId" value={id} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Immatriculation">
                  <Input
                    name="plate"
                    required
                    placeholder="AB-123-CD"
                    autoCapitalize="characters"
                  />
                </Field>
                <Field label="Marque">
                  <Input name="brand" required placeholder="Yamaha" />
                </Field>
                <Field label="Modèle">
                  <Input name="model" required placeholder="MT-07" />
                </Field>
                <Field label="Année">
                  <Input name="year" type="number" min={1900} max={2100} />
                </Field>
                <Field label="Cylindrée (cm³)">
                  <Input name="displacement" type="number" min={0} />
                </Field>
                <Field label="Kilométrage">
                  <Input name="mileage" type="number" min={0} />
                </Field>
              </div>
              <button type="submit" className={buttonClass}>
                Ajouter et photographier la carte grise
              </button>
            </form>
          </details>
        </Card>
      </div>

      <Card title="Historique des dépannages et interventions">
        {client.interventions.length === 0 ? (
          <Empty>Aucune intervention pour ce client.</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {client.interventions.map((intervention) => (
              <li key={intervention.id}>
                <Link
                  href={`/admin/interventions/${intervention.id}`}
                  className="block py-3 hover:text-gold-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {intervention.title}
                    </p>
                    <Badge tone={INTERVENTION_STATUS_TONES[intervention.status]}>
                      {INTERVENTION_STATUSES[intervention.status]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {intervention.reference} · {INTERVENTION_TYPES[intervention.type]} ·{" "}
                    {formatDate(intervention.createdAt)}
                    {intervention.vehicle
                      ? ` · ${intervention.vehicle.brand} ${intervention.vehicle.model} (${formatPlate(intervention.vehicle.plate)})`
                      : ""}
                  </p>
                  {intervention.services.length > 0 ? (
                    <p className="mt-1.5 flex flex-wrap gap-1.5">
                      {intervention.services.slice(0, 6).map((service) => (
                        <Badge key={service.id}>{service.label}</Badge>
                      ))}
                      {intervention.services.length > 6 ? (
                        <Badge>+{intervention.services.length - 6}</Badge>
                      ) : null}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            Nouvelle intervention
          </summary>
          <form action={createInterventionAction} className="mt-4 space-y-3">
            <input type="hidden" name="clientId" value={id} />
            <input type="hidden" name="origin" value={`/admin/clients/${id}`} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Intitulé" className="sm:col-span-2">
                <Input
                  name="title"
                  required
                  placeholder="Révision 10 000 km"
                />
              </Field>
              <Field label="Type">
                <Select name="type" defaultValue="ENTRETIEN">
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
              <Field label="Kilométrage">
                <Input name="mileage" type="number" min={0} />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <Textarea name="description" rows={2} />
              </Field>
            </div>
            <button type="submit" className={buttonClass}>
              Créer et cocher les prestations
            </button>
          </form>
        </details>
      </Card>

      <Card title="Accessoires et produits remis">
        {client.sales.length === 0 ? (
          <Empty>Aucun accessoire remis à ce client.</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {client.sales.map((sale) => (
              <li key={sale.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    {sale.reference}
                  </p>
                  <span className="text-xs text-slate-400">
                    {formatDate(sale.soldAt)}
                  </span>
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {sale.lines.map((line) => (
                    <li key={line.id} className="text-xs text-slate-500">
                      {line.quantity} × {line.label}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            Remettre un accessoire
          </summary>
          <form action={createSaleAction} className="mt-4 space-y-3">
            <input type="hidden" name="clientId" value={id} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Produit" className="sm:col-span-2">
                <Select name="productId" required defaultValue="">
                  <option value="" disabled>
                    — Choisir —
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.stockQty} en stock)
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Quantité">
                <Input name="quantity" type="number" min={1} defaultValue={1} />
              </Field>
            </div>
            <button type="submit" className={buttonClass}>
              Enregistrer la sortie
            </button>
          </form>
        </details>
      </Card>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] tracking-[0.12em] text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
