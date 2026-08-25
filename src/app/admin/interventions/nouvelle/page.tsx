import Link from "next/link";

import {
  Badge,
  Card,
  DataRow,
  Field,
  Flash,
  Input,
  LinkButton,
  PageHeader,
  Select,
  Textarea,
  buttonClass,
  buttonGhostClass,
  buttonGoldClass,
} from "@/components/ui";
import { createInterventionAction } from "@/lib/actions/interventions";
import { prisma } from "@/lib/db";
import { formatMileage, formatPlate, fullName, normalizePlate } from "@/lib/format";
import { INTERVENTION_TYPES, options } from "@/lib/labels";

export const dynamic = "force-dynamic";

export const metadata = { title: "Nouvelle intervention" };

export default async function NewInterventionPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    vehicleId?: string;
    clientId?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  // Étape 2 : une cible est choisie, on affiche le formulaire
  const vehicle = params.vehicleId
    ? await prisma.vehicle.findUnique({
        where: { id: params.vehicleId },
        include: { client: { include: { vehicles: true } } },
      })
    : null;

  const client =
    vehicle?.client ??
    (params.clientId
      ? await prisma.client.findUnique({
          where: { id: params.clientId },
          include: { vehicles: true },
        })
      : null);

  if (client) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Nouvelle intervention"
          subtitle={`Pour ${fullName(client)}`}
          action={
            <LinkButton href="/admin/interventions/nouvelle">
              Changer de client
            </LinkButton>
          }
        />

        <Flash error={params.error} />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Propriétaire">
            <dl>
              <DataRow label="Client" value={fullName(client)} />
              <DataRow label="Téléphone" value={client.phone} />
              {client.city ? <DataRow label="Ville" value={client.city} /> : null}
            </dl>
            <Link
              href={`/admin/clients/${client.id}`}
              className="mt-3 inline-block text-sm text-gold-700 underline underline-offset-4"
            >
              Voir la fiche complète
            </Link>
          </Card>

          <Card title="Intervention" className="lg:col-span-2">
            <form action={createInterventionAction} className="space-y-4">
              <input type="hidden" name="clientId" value={client.id} />
              <input
                type="hidden"
                name="origin"
                value={`/admin/interventions/nouvelle?${
                  vehicle ? `vehicleId=${vehicle.id}` : `clientId=${client.id}`
                }`}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Véhicule" className="sm:col-span-2">
                  <Select name="vehicleId" defaultValue={vehicle?.id ?? ""}>
                    <option value="">— Aucun véhicule —</option>
                    {client.vehicles.map((item) => (
                      <option key={item.id} value={item.id}>
                        {formatPlate(item.plate)} — {item.brand} {item.model}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Intitulé" className="sm:col-span-2">
                  <Input
                    name="title"
                    required
                    autoFocus
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

                <Field label="Kilométrage">
                  <Input
                    name="mileage"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    defaultValue={vehicle?.mileage ?? ""}
                  />
                </Field>

                <Field label="Lieu de prise en charge" hint="Pour un dépannage">
                  <Input name="pickupLocation" placeholder="Pont de Sèvres" />
                </Field>

                <Field label="Lieu de restitution">
                  <Input name="dropoffLocation" placeholder="Atelier" />
                </Field>

                <Field label="Description" className="sm:col-span-2">
                  <Textarea name="description" rows={3} />
                </Field>
              </div>

              <button type="submit" className={buttonGoldClass}>
                Créer et cocher les prestations
              </button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // Étape 1 : recherche du propriétaire ou du véhicule
  const plate = normalizePlate(query);

  const [vehicles, clients] = query
    ? await Promise.all([
        prisma.vehicle.findMany({
          where: {
            OR: [
              ...(plate.length >= 2 ? [{ plate: { contains: plate } }] : []),
              { brand: { contains: query, mode: "insensitive" as const } },
              { model: { contains: query, mode: "insensitive" as const } },
              { vin: { contains: query, mode: "insensitive" as const } },
              {
                client: {
                  OR: [
                    { lastName: { contains: query, mode: "insensitive" as const } },
                    { firstName: { contains: query, mode: "insensitive" as const } },
                    { phone: { contains: query } },
                  ],
                },
              },
            ],
          },
          include: { client: true },
          orderBy: { updatedAt: "desc" },
          take: 15,
        }),
        prisma.client.findMany({
          where: {
            OR: [
              { lastName: { contains: query, mode: "insensitive" as const } },
              { firstName: { contains: query, mode: "insensitive" as const } },
              { company: { contains: query, mode: "insensitive" as const } },
              { phone: { contains: query } },
              { email: { contains: query, mode: "insensitive" as const } },
            ],
          },
          include: { _count: { select: { vehicles: true } } },
          orderBy: { lastName: "asc" },
          take: 15,
        }),
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouvelle intervention"
        subtitle="Trouvez d'abord le véhicule ou son propriétaire"
        action={<LinkButton href="/admin/interventions">Annuler</LinkButton>}
      />

      <Flash error={params.error} />

      <Card>
        <form method="get" className="flex flex-col gap-2 sm:flex-row">
          <Input
            name="q"
            defaultValue={query}
            autoFocus
            placeholder="Plaque, nom, téléphone, marque ou modèle…"
            className="sm:flex-1"
          />
          <button type="submit" className={buttonClass}>
            Chercher
          </button>
        </form>

        {!query ? (
          <p className="mt-4 text-sm text-slate-500">
            Tapez une plaque (AB-123-CD ou AB123CD), un nom, un numéro de
            téléphone ou un modèle.
          </p>
        ) : null}
      </Card>

      {query && vehicles.length > 0 ? (
        <Card title={`Véhicules (${vehicles.length})`}>
          <ul className="divide-y divide-slate-100">
            {vehicles.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {item.brand} {item.model}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {fullName(item.client)} · {item.client.phone} ·{" "}
                    {formatMileage(item.mileage)}
                  </p>
                </div>
                <Badge tone="gold">{formatPlate(item.plate)}</Badge>
                <Link
                  href={`/admin/interventions/nouvelle?vehicleId=${item.id}`}
                  className={buttonGoldClass}
                >
                  Choisir
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {query && clients.length > 0 ? (
        <Card title={`Clients (${clients.length})`}>
          <ul className="divide-y divide-slate-100">
            {clients.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {fullName(item)}
                    {item.company ? (
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {item.company}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {item.phone}
                    {item.city ? ` · ${item.city}` : ""} ·{" "}
                    {item._count.vehicles} véhicule(s)
                  </p>
                </div>
                <Link
                  href={`/admin/interventions/nouvelle?clientId=${item.id}`}
                  className={buttonGhostClass}
                >
                  Choisir
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {query && vehicles.length === 0 && clients.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            Rien ne correspond à «&nbsp;{query}&nbsp;».
          </p>
          <Link href="/admin/clients/nouveau" className={`${buttonGoldClass} mt-3`}>
            Créer une fiche client
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
