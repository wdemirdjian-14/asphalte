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
  Textarea,
  Thumb,
  buttonClass,
  buttonDangerClass,
  buttonGhostClass,
  buttonGoldClass,
} from "@/components/ui";
import {
  addReceptionLineAction,
  createProductAndAddLineAction,
  deleteReceptionLineAction,
  updateReceptionAction,
  updateReceptionLineAction,
  validateReceptionAction,
} from "@/lib/actions/receptions";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { RECEPTION_STATUSES } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function ReceptionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string; q?: string }>;
}) {
  const { id } = await params;
  const { error, ok, q } = await searchParams;
  const query = (q ?? "").trim();

  const reception = await prisma.reception.findUnique({
    where: { id },
    include: {
      supplier: true,
      receivedBy: { select: { name: true } },
      lines: {
        include: { product: { include: { photos: { take: 1, orderBy: { position: "asc" } } } } },
        orderBy: { id: "asc" },
      },
      movements: {
        include: { product: { select: { id: true, name: true, sku: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!reception) notFound();

  const draft = reception.status === "BROUILLON";
  const totalUnits = reception.lines.reduce((sum, line) => sum + line.quantity, 0);

  // Résultats de la barre de recherche : le catalogue filtré à la volée
  const matches =
    draft && query.length >= 1
      ? await prisma.product.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { brand: { contains: query, mode: "insensitive" } },
              { sku: { contains: query, mode: "insensitive" } },
              { location: { contains: query, mode: "insensitive" } },
            ],
          },
          include: { photos: { take: 1, orderBy: { position: "asc" } } },
          orderBy: { name: "asc" },
          take: 12,
        })
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={reception.reference}
        subtitle={
          reception.supplier
            ? `Colis de ${reception.supplier.name}`
            : "Colis sans fournisseur renseigné"
        }
        action={
          <div className="flex items-center gap-2">
            <Badge tone={draft ? "gold" : "green"}>
              {RECEPTION_STATUSES[reception.status]}
            </Badge>
            <LinkButton href="/admin/receptions">Réceptions</LinkButton>
          </div>
        }
      />

      <Flash error={error} ok={ok} />

      {draft ? (
        <Card title="Ajouter au colis">
          {/* Barre de recherche : on tape, on choisit, c'est ajouté */}
          <form method="get" className="flex gap-2">
            <Input
              name="q"
              defaultValue={query}
              autoFocus
              placeholder="Chercher un produit : plaquettes, pneu, huile…"
              className="flex-1"
            />
            <button type="submit" className={buttonClass}>
              Chercher
            </button>
          </form>

          {query.length >= 1 ? (
            matches.length > 0 ? (
              <ul className="mt-4 divide-y divide-slate-100">
                {matches.map((product) => (
                  <li key={product.id} className="flex items-center gap-3 py-2.5">
                    <Thumb src={product.photos[0]?.url} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {product.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {product.brand ? `${product.brand} · ` : ""}
                        {product.stockQty} en stock
                      </p>
                    </div>
                    <form
                      action={addReceptionLineAction}
                      className="flex shrink-0 items-center gap-2"
                    >
                      <input type="hidden" name="receptionId" value={id} />
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="q" value={query} />
                      <Input
                        name="quantity"
                        type="number"
                        min={1}
                        defaultValue={1}
                        aria-label={`Quantité reçue de ${product.name}`}
                        className="w-20"
                      />
                      <button type="submit" className={buttonGoldClass}>
                        Ajouter
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  Aucun produit ne correspond à «&nbsp;{query}&nbsp;».
                </p>
                <form
                  action={createProductAndAddLineAction}
                  className="mt-3 flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="receptionId" value={id} />
                  <input type="hidden" name="name" value={query} />
                  <Field label="Quantité">
                    <Input
                      name="quantity"
                      type="number"
                      min={1}
                      defaultValue={1}
                      className="w-24"
                    />
                  </Field>
                  <button type="submit" className={buttonGoldClass}>
                    Créer «&nbsp;{query}&nbsp;» et l&apos;ajouter
                  </button>
                </form>
                <p className="mt-2 text-xs text-slate-500">
                  La fiche est créée avec ce nom. Photo et détails se complètent
                  ensuite depuis le catalogue.
                </p>
              </div>
            )
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Tapez les premières lettres d&apos;un produit. S&apos;il n&apos;existe
              pas encore, vous pourrez le créer d&apos;un clic.
            </p>
          )}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={`Contenu du colis (${reception.lines.length})`} className="lg:col-span-2">
          {reception.lines.length === 0 ? (
            <Empty>Le colis est vide. Cherchez un produit ci-dessus.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {reception.lines.map((line) => (
                <li key={line.id} className="flex items-center gap-3 py-2.5">
                  <Thumb src={line.product.photos[0]?.url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/produits/${line.productId}`}
                      className="truncate text-sm font-medium text-slate-900 hover:text-gold-700"
                    >
                      {line.product.name}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {line.product.sku}
                      {line.notes ? ` · ${line.notes}` : ""}
                    </p>
                  </div>

                  {draft ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <form
                        action={updateReceptionLineAction}
                        className="flex items-center gap-1"
                      >
                        <input type="hidden" name="id" value={line.id} />
                        <Input
                          name="quantity"
                          type="number"
                          min={1}
                          defaultValue={line.quantity}
                          aria-label={`Quantité de ${line.product.name}`}
                          className="w-20"
                        />
                        <button type="submit" className={buttonGhostClass}>
                          OK
                        </button>
                      </form>
                      <form action={deleteReceptionLineAction}>
                        <input type="hidden" name="id" value={line.id} />
                        <button type="submit" className={buttonDangerClass}>
                          Retirer
                        </button>
                      </form>
                    </div>
                  ) : (
                    <span className="shrink-0 text-lg font-bold text-slate-900">
                      ×{line.quantity}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Colis">
          <dl>
            <DataRow label="Fournisseur" value={reception.supplier?.name ?? "—"} />
            <DataRow label="Transporteur" value={reception.carrier ?? "—"} />
            <DataRow label="Suivi" value={reception.trackingNumber ?? "—"} />
            <DataRow label="Nombre de colis" value={String(reception.packageCount)} />
            <DataRow label="Reçu le" value={formatDateTime(reception.receivedAt)} />
            <DataRow label="Reçu par" value={reception.receivedBy?.name ?? "—"} />
            <DataRow label="Validé le" value={formatDateTime(reception.validatedAt)} />
            <DataRow label="Total unités" value={String(totalUnits)} />
          </dl>
          {reception.notes ? (
            <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              {reception.notes}
            </p>
          ) : null}
        </Card>
      </div>

      {draft ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Valider et entrer en stock">
            <form action={validateReceptionAction} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <p className="text-sm text-slate-600">
                {reception.lines.length} produit(s), {totalUnits} unité(s)
                entreront en stock en une seule opération. Chaque mouvement
                gardera le lien vers ce colis : fournisseur, transporteur,
                numéro de suivi, opérateur et date.
              </p>
              <button
                type="submit"
                className={`${buttonGoldClass} w-full text-base`}
                disabled={reception.lines.length === 0}
              >
                Valider la réception
              </button>
              <p className="text-xs text-slate-500">
                Après validation, le colis n&apos;est plus modifiable : les
                corrections passent par un ajustement de stock motivé.
              </p>
            </form>
          </Card>

          <Card title="Modifier l'entête">
            <form action={updateReceptionAction} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Transporteur">
                  <Input name="carrier" defaultValue={reception.carrier ?? ""} />
                </Field>
                <Field label="Numéro de suivi">
                  <Input
                    name="trackingNumber"
                    defaultValue={reception.trackingNumber ?? ""}
                  />
                </Field>
                <Field label="Nombre de colis">
                  <Input
                    name="packageCount"
                    type="number"
                    min={1}
                    defaultValue={reception.packageCount}
                  />
                </Field>
                <Field label="Notes" className="sm:col-span-2">
                  <Textarea name="notes" rows={2} defaultValue={reception.notes ?? ""} />
                </Field>
              </div>
              <button type="submit" className={buttonClass}>
                Enregistrer
              </button>
            </form>
          </Card>
        </div>
      ) : (
        <Card title="Mouvements générés">
          {reception.movements.length === 0 ? (
            <Empty>Aucun mouvement rattaché à cette réception.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {reception.movements.map((movement) => (
                <li
                  key={movement.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/produits/${movement.product.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-gold-700"
                    >
                      {movement.product.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {movement.product.sku} · {formatDateTime(movement.createdAt)} ·{" "}
                      {movement.userLabel}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">
                    +{movement.quantity} ({movement.stockBefore} → {movement.stockAfter})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
