import Link from "next/link";

import { Badge, Card, Empty, PageHeader, Select, buttonClass } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate, formatPlate, fullName } from "@/lib/format";
import {
  INTERVENTION_STATUS_TONES,
  INTERVENTION_STATUSES,
  INTERVENTION_TYPES,
  options,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

export const metadata = { title: "Interventions" };

export default async function InterventionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const params = await searchParams;
  const status =
    params.status && params.status in INTERVENTION_STATUSES ? params.status : "";
  const type = params.type && params.type in INTERVENTION_TYPES ? params.type : "";

  const interventions = await prisma.intervention.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(type ? { type: type as never } : {}),
    },
    include: { client: true, vehicle: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interventions"
        subtitle="Dépannages, réparations, entretiens et diagnostics"
      />

      <form method="get" className="flex flex-col gap-2 sm:flex-row">
        <Select name="status" defaultValue={status} className="sm:w-52">
          <option value="">Tous les statuts</option>
          {options(INTERVENTION_STATUSES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select name="type" defaultValue={type} className="sm:w-52">
          <option value="">Tous les types</option>
          {options(INTERVENTION_TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <button type="submit" className={buttonClass}>
          Filtrer
        </button>
      </form>

      {interventions.length === 0 ? (
        <Empty>
          Aucune intervention. Créez-en une depuis la fiche d&apos;un client.
        </Empty>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-200">
            {interventions.map((intervention) => (
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
                      {intervention.reference} · {fullName(intervention.client)} ·{" "}
                      {formatDate(intervention.createdAt)}
                      {intervention.vehicle
                        ? ` · ${formatPlate(intervention.vehicle.plate)}`
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
        </Card>
      )}
    </div>
  );
}
