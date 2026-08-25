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
import {
  addInterventionLineAction,
  deleteInterventionLineAction,
  updateInterventionAction,
} from "@/lib/actions/interventions";
import { prisma } from "@/lib/db";
import {
  formatDate,
  formatDateTime,
  formatPlate,
  formatPrice,
  fullName,
  toNumber,
} from "@/lib/format";
import {
  INTERVENTION_STATUS_TONES,
  INTERVENTION_STATUSES,
  INTERVENTION_TYPES,
  options,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function InterventionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;

  const [intervention, products] = await Promise.all([
    prisma.intervention.findUnique({
      where: { id },
      include: {
        client: true,
        vehicle: true,
        lines: { include: { product: true } },
      },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true, stockQty: true, salePrice: true },
    }),
  ]);

  if (!intervention) notFound();

  const labor = toNumber(intervention.laborHours) * toNumber(intervention.laborRate);

  return (
    <div className="space-y-6">
      <PageHeader
        title={intervention.title}
        subtitle={`${intervention.reference} · ${INTERVENTION_TYPES[intervention.type]}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={INTERVENTION_STATUS_TONES[intervention.status]}>
              {INTERVENTION_STATUSES[intervention.status]}
            </Badge>
            <LinkButton href={`/admin/clients/${intervention.clientId}`}>
              Fiche client
            </LinkButton>
          </div>
        }
      />

      <Flash error={error} ok={ok} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Dossier">
          <dl>
            <DataRow
              label="Client"
              value={
                <Link
                  href={`/admin/clients/${intervention.clientId}`}
                  className="text-gold-300 hover:underline"
                >
                  {fullName(intervention.client)}
                </Link>
              }
            />
            <DataRow label="Téléphone" value={intervention.client.phone} />
            <DataRow
              label="Véhicule"
              value={
                intervention.vehicle
                  ? `${intervention.vehicle.brand} ${intervention.vehicle.model} — ${formatPlate(intervention.vehicle.plate)}`
                  : "—"
              }
            />
            <DataRow label="Ouvert le" value={formatDate(intervention.createdAt)} />
            <DataRow
              label="Terminé le"
              value={formatDateTime(intervention.completedAt)}
            />
            {intervention.pickupLocation ? (
              <DataRow label="Prise en charge" value={intervention.pickupLocation} />
            ) : null}
            {intervention.dropoffLocation ? (
              <DataRow label="Restitution" value={intervention.dropoffLocation} />
            ) : null}
            <DataRow
              label="Kilométrage"
              value={
                intervention.mileage
                  ? `${intervention.mileage.toLocaleString("fr-FR")} km`
                  : "—"
              }
            />
          </dl>

          <dl className="mt-4 border-t border-ink-800 pt-3">
            <DataRow
              label="Main-d'œuvre"
              value={`${toNumber(intervention.laborHours)} h × ${formatPrice(intervention.laborRate)} = ${formatPrice(labor)}`}
            />
            <DataRow label="Pièces" value={formatPrice(intervention.partsTotal)} />
            <DataRow
              label="Total"
              value={
                <span className="text-base font-bold text-gold-300">
                  {formatPrice(intervention.totalAmount)}
                </span>
              }
            />
          </dl>
        </Card>

        <Card title="Pièces et prestations" className="lg:col-span-2">
          {intervention.lines.length === 0 ? (
            <Empty>Aucune ligne. Ajoutez une pièce du stock ou une prestation.</Empty>
          ) : (
            <ul className="divide-y divide-ink-800">
              {intervention.lines.map((line) => (
                <li
                  key={line.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink-100">{line.label}</p>
                    <p className="text-xs text-ink-500">
                      {toNumber(line.quantity)} × {formatPrice(line.unitPrice)}
                      {line.product ? ` · ${line.product.sku} (stock)` : " · hors stock"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-ink-100">
                      {formatPrice(toNumber(line.quantity) * toNumber(line.unitPrice))}
                    </span>
                    <form action={deleteInterventionLineAction}>
                      <input type="hidden" name="id" value={line.id} />
                      <button type="submit" className={buttonDangerClass}>
                        Retirer
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            action={addInterventionLineAction}
            className="mt-4 space-y-3 rounded-lg border border-ink-800 p-3"
          >
            <input type="hidden" name="interventionId" value={id} />
            <p className="text-xs text-ink-400">
              Une pièce choisie au catalogue sort automatiquement du stock, avec
              trace du dossier.
            </p>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Pièce du stock" className="sm:col-span-2">
                <Select name="productId" defaultValue="">
                  <option value="">— Prestation hors stock —</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku}) — {product.stockQty} en stock
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Libellé" hint="Vide = nom du produit">
                <Input name="label" />
              </Field>
              <Field label="Quantité">
                <Input name="quantity" type="number" step="0.5" min={0.5} defaultValue={1} />
              </Field>
              <Field label="Prix unitaire (€)" hint="Vide = prix catalogue">
                <Input name="unitPrice" type="number" step="0.01" min={0} />
              </Field>
            </div>
            <button type="submit" className={buttonClass}>
              Ajouter la ligne
            </button>
          </form>
        </Card>
      </div>

      <Card title="Modifier le dossier">
        <form action={updateInterventionAction} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Intitulé" className="sm:col-span-2">
              <Input name="title" required defaultValue={intervention.title} />
            </Field>
            <Field label="Statut">
              <Select name="status" defaultValue={intervention.status}>
                {options(INTERVENTION_STATUSES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type">
              <Select name="type" defaultValue={intervention.type}>
                {options(INTERVENTION_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Heures de main-d'œuvre">
              <Input
                name="laborHours"
                type="number"
                step="0.25"
                min={0}
                defaultValue={toNumber(intervention.laborHours)}
              />
            </Field>
            <Field label="Taux horaire (€)">
              <Input
                name="laborRate"
                type="number"
                step="0.01"
                min={0}
                defaultValue={toNumber(intervention.laborRate)}
              />
            </Field>
            <Field label="Lieu de prise en charge">
              <Input
                name="pickupLocation"
                defaultValue={intervention.pickupLocation ?? ""}
              />
            </Field>
            <Field label="Lieu de restitution">
              <Input
                name="dropoffLocation"
                defaultValue={intervention.dropoffLocation ?? ""}
              />
            </Field>
            <Field label="Kilométrage">
              <Input
                name="mileage"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={intervention.mileage ?? ""}
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea
                name="description"
                rows={3}
                defaultValue={intervention.description ?? ""}
              />
            </Field>
          </div>
          <button type="submit" className={buttonClass}>
            Enregistrer
          </button>
        </form>
      </Card>
    </div>
  );
}
