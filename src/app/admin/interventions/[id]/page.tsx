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
  buttonGoldClass,
} from "@/components/ui";
import {
  addInterventionPartAction,
  deleteInterventionPartAction,
  saveInterventionServicesAction,
  updateInterventionAction,
} from "@/lib/actions/interventions";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatMileage, formatPlate, fullName } from "@/lib/format";
import {
  INTERVENTION_STATUS_TONES,
  INTERVENTION_STATUSES,
  INTERVENTION_TYPES,
  SERVICE_CATEGORIES,
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

  const [intervention, products, catalogue] = await Promise.all([
    prisma.intervention.findUnique({
      where: { id },
      include: {
        client: true,
        vehicle: true,
        parts: { include: { product: true } },
        services: { orderBy: { label: "asc" } },
      },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, stockQty: true },
    }),
    prisma.serviceTask.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { position: "asc" }],
    }),
  ]);

  if (!intervention) notFound();

  const doneTaskIds = new Set(
    intervention.services.map((service) => service.serviceTaskId).filter(Boolean),
  );
  const customServices = intervention.services.filter((s) => !s.serviceTaskId);

  const grouped = catalogue.reduce<Record<string, typeof catalogue>>((acc, task) => {
    (acc[task.category] ??= []).push(task);
    return acc;
  }, {});

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

      {/* Prestations : tout se coche, une seule validation */}
      <Card title="Prestations réalisées">
        <form action={saveInterventionServicesAction} className="space-y-5">
          <input type="hidden" name="interventionId" value={id} />

          {options(SERVICE_CATEGORIES).map(([category, label]) => {
            const tasks = grouped[category];
            if (!tasks || tasks.length === 0) return null;

            return (
              <fieldset key={category}>
                <legend className="text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
                  {label}
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tasks.map((task) => (
                    <label
                      key={task.id}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors select-none hover:border-gold-400 has-checked:border-gold-500 has-checked:bg-gold-50 has-checked:font-semibold has-checked:text-gold-900"
                    >
                      <input
                        type="checkbox"
                        name="serviceTaskId"
                        value={task.id}
                        defaultChecked={doneTaskIds.has(task.id)}
                        className="h-4 w-4 accent-gold-600"
                      />
                      {task.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-end">
            <Field label="Autre prestation" className="flex-1">
              <Input
                name="customService"
                placeholder="Ex. remplacement du câble d'embrayage"
              />
            </Field>
            <button type="submit" className={buttonGoldClass}>
              Enregistrer les prestations
            </button>
          </div>
        </form>

        {customServices.length > 0 ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
              Prestations saisies à la main
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {customServices.map((service) => (
                <li key={service.id}>
                  <Badge tone="gold">{service.label}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Dossier">
          <dl>
            <DataRow
              label="Client"
              value={
                <Link
                  href={`/admin/clients/${intervention.clientId}`}
                  className="text-gold-700 hover:underline"
                >
                  {fullName(intervention.client)}
                </Link>
              }
            />
            <DataRow label="Téléphone" value={intervention.client.phone} />
            <DataRow
              label="Véhicule"
              value={
                intervention.vehicle ? (
                  <Link
                    href={`/admin/vehicules/${intervention.vehicle.id}`}
                    className="text-gold-700 hover:underline"
                  >
                    {intervention.vehicle.brand} {intervention.vehicle.model} —{" "}
                    {formatPlate(intervention.vehicle.plate)}
                  </Link>
                ) : (
                  "—"
                )
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
            <DataRow label="Kilométrage" value={formatMileage(intervention.mileage)} />
          </dl>
          {intervention.description ? (
            <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-600">
              {intervention.description}
            </p>
          ) : null}
        </Card>

        <Card title="Pièces montées" className="lg:col-span-2">
          {intervention.parts.length === 0 ? (
            <Empty>Aucune pièce. Ajoutez celles sorties du stock.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {intervention.parts.map((part) => (
                <li
                  key={part.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {part.label}
                    </p>
                    <p className="text-xs text-slate-500">
                      {part.product ? "Sortie du stock" : "Hors stock"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-900">
                      ×{part.quantity}
                    </span>
                    <form action={deleteInterventionPartAction}>
                      <input type="hidden" name="id" value={part.id} />
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
            action={addInterventionPartAction}
            className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <input type="hidden" name="interventionId" value={id} />
            <p className="text-xs text-slate-500">
              Une pièce choisie au catalogue sort automatiquement du stock, avec
              trace du dossier.
            </p>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Pièce du stock" className="sm:col-span-2">
                <Select name="productId" defaultValue="">
                  <option value="">— Pièce hors stock —</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.stockQty} en stock)
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Libellé" hint="Vide = nom du produit">
                <Input name="label" />
              </Field>
              <Field label="Quantité">
                <Input name="quantity" type="number" min={1} defaultValue={1} />
              </Field>
            </div>
            <button type="submit" className={buttonClass}>
              Ajouter la pièce
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
