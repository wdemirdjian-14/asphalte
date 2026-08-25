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
  addReceptionLineAction,
  deleteReceptionLineAction,
  updateReceptionAction,
  validateReceptionAction,
} from "@/lib/actions/receptions";
import { prisma } from "@/lib/db";
import { formatDateTime, formatPrice } from "@/lib/format";
import {
  PRODUCT_CATEGORIES,
  RECEPTION_STATUSES,
  options,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function ReceptionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;

  const [reception, products] = await Promise.all([
    prisma.reception.findUnique({
      where: { id },
      include: {
        supplier: true,
        receivedBy: { select: { name: true } },
        lines: { include: { product: true }, orderBy: { id: "asc" } },
        movements: {
          include: { product: { select: { id: true, name: true, sku: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true, stockQty: true },
    }),
  ]);

  if (!reception) notFound();

  const draft = reception.status === "BROUILLON";
  const totalUnits = reception.lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalCost = reception.lines.reduce(
    (sum, line) => sum + line.quantity * Number(line.unitCost),
    0,
  );
  const discrepancies = reception.lines.filter(
    (line) => line.expectedQty > 0 && line.expectedQty !== line.quantity,
  );

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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Colis">
          <dl>
            <DataRow label="Fournisseur" value={reception.supplier?.name ?? "—"} />
            <DataRow label="Transporteur" value={reception.carrier ?? "—"} />
            <DataRow label="Suivi" value={reception.trackingNumber ?? "—"} />
            <DataRow label="Facture / BL" value={reception.invoiceNumber ?? "—"} />
            <DataRow label="Nombre de colis" value={String(reception.packageCount)} />
            <DataRow label="Reçu le" value={formatDateTime(reception.receivedAt)} />
            <DataRow label="Reçu par" value={reception.receivedBy?.name ?? "—"} />
            <DataRow label="Validé le" value={formatDateTime(reception.validatedAt)} />
            <DataRow label="Unités" value={String(totalUnits)} />
            <DataRow label="Valeur d'achat" value={formatPrice(totalCost)} />
          </dl>
          {reception.notes ? (
            <p className="mt-3 rounded-lg border border-ink-800 bg-ink-950/60 p-3 text-sm text-ink-300">
              {reception.notes}
            </p>
          ) : null}
        </Card>

        <Card title="Contenu du colis" className="lg:col-span-2">
          {reception.lines.length === 0 ? (
            <Empty>Ajoutez les produits contenus dans le colis.</Empty>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-ink-800 text-left text-xs tracking-wide text-ink-400 uppercase">
                    <th className="py-2 pr-3 font-medium">Produit</th>
                    <th className="py-2 pr-3 text-right font-medium">Attendu</th>
                    <th className="py-2 pr-3 text-right font-medium">Reçu</th>
                    <th className="py-2 pr-3 text-right font-medium">Achat unit.</th>
                    <th className="py-2 pr-3 font-medium">Lot</th>
                    {draft ? <th className="py-2" /> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800/70">
                  {reception.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="py-2 pr-3">
                        <Link
                          href={`/admin/produits/${line.productId}`}
                          className="text-ink-100 hover:text-gold-300"
                        >
                          {line.product.name}
                        </Link>
                        <span className="block text-xs text-ink-500">
                          {line.product.sku}
                          {line.notes ? ` · ${line.notes}` : ""}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right text-ink-400">
                        {line.expectedQty || "—"}
                      </td>
                      <td
                        className={`py-2 pr-3 text-right font-medium ${
                          line.expectedQty > 0 && line.expectedQty !== line.quantity
                            ? "text-gold-300"
                            : "text-ink-100"
                        }`}
                      >
                        {line.quantity}
                      </td>
                      <td className="py-2 pr-3 text-right text-ink-300">
                        {formatPrice(line.unitCost)}
                      </td>
                      <td className="py-2 pr-3 text-ink-400">{line.batch ?? "—"}</td>
                      {draft ? (
                        <td className="py-2 text-right">
                          <form action={deleteReceptionLineAction}>
                            <input type="hidden" name="id" value={line.id} />
                            <button type="submit" className={buttonDangerClass}>
                              Retirer
                            </button>
                          </form>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {discrepancies.length > 0 ? (
            <p className="mt-3 rounded-lg border border-gold-500/40 bg-gold-500/10 px-3 py-2 text-xs text-gold-200">
              {discrepancies.length} ligne(s) avec un écart entre le bon de
              livraison et le contenu réel.
            </p>
          ) : null}

          {draft ? (
            <form
              action={addReceptionLineAction}
              className="mt-4 space-y-3 rounded-lg border border-ink-800 p-3"
            >
              <input type="hidden" name="receptionId" value={id} />
              <p className="text-xs text-ink-400">
                Choisissez un produit du catalogue, ou laissez vide et
                renseignez le bloc « nouveau produit » pour créer la fiche à la
                volée.
              </p>
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Produit du catalogue" className="sm:col-span-2">
                  <Select name="productId" defaultValue="">
                    <option value="">— Nouveau produit —</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku}) — {product.stockQty} en stock
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Quantité attendue" hint="D'après le bon de livraison">
                  <Input name="expectedQty" type="number" min={0} />
                </Field>
                <Field label="Quantité reçue">
                  <Input name="quantity" type="number" min={1} required defaultValue={1} />
                </Field>
                <Field label="Prix d'achat unitaire (€)">
                  <Input name="unitCost" type="number" step="0.01" min={0} defaultValue={0} />
                </Field>
                <Field label="Lot / série">
                  <Input name="batch" />
                </Field>
                <Field label="Note de ligne" className="sm:col-span-2">
                  <Input name="notes" placeholder="2 manquants sur le BL" />
                </Field>
              </div>

              <details className="rounded-lg border border-ink-800 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-gold-300">
                  Nouveau produit (si absent du catalogue)
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <Field label="Référence (SKU)">
                    <Input name="newSku" autoCapitalize="characters" />
                  </Field>
                  <Field label="Nom" className="sm:col-span-2">
                    <Input name="newName" />
                  </Field>
                  <Field label="Catégorie">
                    <Select name="newCategory" defaultValue="PIECE">
                      {options(PRODUCT_CATEGORIES).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Marque">
                    <Input name="newBrand" />
                  </Field>
                  <Field label="Prix de vente TTC (€)">
                    <Input name="newSalePrice" type="number" step="0.01" min={0} />
                  </Field>
                </div>
              </details>

              <button type="submit" className={buttonClass}>
                Ajouter la ligne
              </button>
            </form>
          ) : null}
        </Card>
      </div>

      {draft ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Valider et entrer en stock">
            <form action={validateReceptionAction} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <p className="text-sm text-ink-300">
                {reception.lines.length} ligne(s), {totalUnits} unité(s) entreront
                en stock en une seule opération. Chaque mouvement gardera le
                lien vers ce colis : fournisseur, transporteur, numéro de suivi,
                opérateur et date.
              </p>
              <label className="flex items-center gap-2 text-sm text-ink-200">
                <input
                  type="checkbox"
                  name="updatePurchasePrice"
                  defaultChecked
                  className="accent-gold-500"
                />
                Mettre à jour le prix d&apos;achat des fiches produits
              </label>
              <button
                type="submit"
                className={buttonClass}
                disabled={reception.lines.length === 0}
              >
                Valider la réception
              </button>
              <p className="text-xs text-ink-500">
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
                <Field label="Facture / BL">
                  <Input
                    name="invoiceNumber"
                    defaultValue={reception.invoiceNumber ?? ""}
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
            <ul className="divide-y divide-ink-800">
              {reception.movements.map((movement) => (
                <li
                  key={movement.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/produits/${movement.product.id}`}
                      className="text-sm text-ink-100 hover:text-gold-300"
                    >
                      {movement.product.name}
                    </Link>
                    <p className="text-xs text-ink-500">
                      {movement.product.sku} · {formatDateTime(movement.createdAt)} ·{" "}
                      {movement.userLabel}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-emerald-300">
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
