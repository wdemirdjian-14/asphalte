import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Badge,
  Card,
  DataRow,
  Empty,
  Field,
  FileInput,
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
  addVehicleDocumentAction,
  deleteVehicleDocumentAction,
  updateVehicleAction,
} from "@/lib/actions/clients";
import { prisma } from "@/lib/db";
import { formatDate, formatMileage, formatPlate, fullName } from "@/lib/format";
import {
  INTERVENTION_STATUS_TONES,
  INTERVENTION_STATUSES,
  INTERVENTION_TYPES,
  VEHICLE_DOCUMENT_KINDS,
  options,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function VehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      client: true,
      documents: { orderBy: [{ kind: "asc" }, { createdAt: "desc" }] },
      interventions: {
        include: { services: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!vehicle) notFound();

  const carteGrise = vehicle.documents.filter((d) => d.kind === "CARTE_GRISE");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${vehicle.brand} ${vehicle.model}`}
        subtitle={`${formatPlate(vehicle.plate)} · ${fullName(vehicle.client)}`}
        action={
          <LinkButton href={`/admin/clients/${vehicle.clientId}`}>
            Fiche client
          </LinkButton>
        }
      />

      <Flash error={error} ok={ok} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Carte grise : le point demandé, en évidence */}
        <Card title="Documents du véhicule" className="lg:col-span-2">
          {vehicle.documents.length === 0 ? (
            <Empty>
              Aucun document. Prenez la carte grise en photo : elle sera
              conservée ici et il n&apos;y aura plus à la redemander.
            </Empty>
          ) : (
            <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {vehicle.documents.map((document) => (
                <li
                  key={document.id}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                >
                  <a href={document.url} target="_blank" rel="noreferrer">
                    <img
                      src={document.url}
                      alt={document.label || VEHICLE_DOCUMENT_KINDS[document.kind]}
                      className="aspect-[3/2] w-full object-cover"
                    />
                  </a>
                  <div className="space-y-2 p-2">
                    <p className="text-xs font-medium text-slate-700">
                      {VEHICLE_DOCUMENT_KINDS[document.kind]}
                      {document.label ? ` — ${document.label}` : ""}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatDate(document.createdAt)}
                    </p>
                    <form action={deleteVehicleDocumentAction}>
                      <input type="hidden" name="id" value={document.id} />
                      <button type="submit" className={`${buttonDangerClass} w-full`}>
                        Supprimer
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            action={addVehicleDocumentAction}
            className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3"
          >
            <input type="hidden" name="vehicleId" value={id} />
            <Field label="Photo du document" className="sm:col-span-2">
              <FileInput name="document" required capture="environment" />
            </Field>
            <Field label="Type">
              <Select name="kind" defaultValue="CARTE_GRISE">
                {options(VEHICLE_DOCUMENT_KINDS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Précision (optionnel)" className="sm:col-span-2">
              <Input name="label" placeholder="Recto, verso…" />
            </Field>
            <div className="flex items-end">
              <button type="submit" className={`${buttonGoldClass} w-full`}>
                Enregistrer
              </button>
            </div>
          </form>
        </Card>

        <Card title="Véhicule">
          <dl>
            <DataRow label="Immatriculation" value={formatPlate(vehicle.plate)} />
            <DataRow label="Marque" value={vehicle.brand} />
            <DataRow label="Modèle" value={vehicle.model} />
            <DataRow label="Année" value={vehicle.year ? String(vehicle.year) : "—"} />
            <DataRow
              label="Cylindrée"
              value={vehicle.displacement ? `${vehicle.displacement} cm³` : "—"}
            />
            <DataRow label="Couleur" value={vehicle.color ?? "—"} />
            <DataRow label="Kilométrage" value={formatMileage(vehicle.mileage)} />
            <DataRow label="VIN" value={vehicle.vin ?? "—"} />
            <DataRow
              label="Carte grise"
              value={
                carteGrise.length > 0 ? (
                  <Badge tone="green">Enregistrée</Badge>
                ) : (
                  <Badge tone="gold">Manquante</Badge>
                )
              }
            />
          </dl>
          {vehicle.notes ? (
            <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              {vehicle.notes}
            </p>
          ) : null}
        </Card>
      </div>

      <Card title="Historique de ce véhicule">
        {vehicle.interventions.length === 0 ? (
          <Empty>Aucune intervention sur ce véhicule.</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {vehicle.interventions.map((intervention) => (
              <li key={intervention.id}>
                <Link
                  href={`/admin/interventions/${intervention.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 hover:text-gold-700"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {intervention.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {intervention.reference} · {INTERVENTION_TYPES[intervention.type]} ·{" "}
                      {formatDate(intervention.createdAt)}
                      {intervention.services.length > 0
                        ? ` · ${intervention.services.length} prestation(s)`
                        : ""}
                    </p>
                  </div>
                  <Badge tone={INTERVENTION_STATUS_TONES[intervention.status]}>
                    {INTERVENTION_STATUSES[intervention.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Modifier le véhicule">
        <form action={updateVehicleAction} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Immatriculation">
              <Input
                name="plate"
                required
                defaultValue={vehicle.plateDisplay}
                autoCapitalize="characters"
              />
            </Field>
            <Field label="Marque">
              <Input name="brand" required defaultValue={vehicle.brand} />
            </Field>
            <Field label="Modèle">
              <Input name="model" required defaultValue={vehicle.model} />
            </Field>
            <Field label="Année">
              <Input
                name="year"
                type="number"
                min={1900}
                max={2100}
                defaultValue={vehicle.year ?? ""}
              />
            </Field>
            <Field label="Cylindrée (cm³)">
              <Input
                name="displacement"
                type="number"
                min={0}
                defaultValue={vehicle.displacement ?? ""}
              />
            </Field>
            <Field label="Kilométrage">
              <Input
                name="mileage"
                type="number"
                min={0}
                defaultValue={vehicle.mileage ?? ""}
              />
            </Field>
            <Field label="Couleur">
              <Input name="color" defaultValue={vehicle.color ?? ""} />
            </Field>
            <Field label="VIN" className="sm:col-span-2">
              <Input
                name="vin"
                defaultValue={vehicle.vin ?? ""}
                autoCapitalize="characters"
              />
            </Field>
            <Field label="Notes" className="sm:col-span-3">
              <Textarea name="notes" rows={2} defaultValue={vehicle.notes ?? ""} />
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
