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
  buttonGhostClass,
} from "@/components/ui";
import {
  addProductPhotoAction,
  adjustStockAction,
  deleteProductPhotoAction,
  updateProductAction,
} from "@/lib/actions/products";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { MOVEMENT_TYPES, PRODUCT_CATEGORIES, options } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { position: "asc" } },
      movements: {
        include: {
          reception: { select: { id: true, reference: true } },
          intervention: { select: { id: true, reference: true } },
          sale: { select: { reference: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!product) notFound();

  const cover = product.photos[0];
  const low = product.stockQty <= product.stockAlert;

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        subtitle={`${product.sku} · ${PRODUCT_CATEGORIES[product.category]}`}
        action={<LinkButton href="/admin/produits">Catalogue</LinkButton>}
      />

      <Flash error={error} ok={ok} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Photo et stock : ce que l'atelier regarde en premier */}
        <Card className="lg:col-span-2">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {cover ? (
                <img
                  src={cover.url}
                  alt={cover.alt || product.name}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-sm text-slate-400">
                  Pas encore de photo
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center gap-4">
              <div>
                <p className="text-xs tracking-wide text-slate-500 uppercase">
                  En stock
                </p>
                <p
                  className={`text-6xl leading-none font-bold ${
                    product.stockQty <= 0
                      ? "text-red-600"
                      : low
                        ? "text-gold-700"
                        : "text-slate-900"
                  }`}
                >
                  {product.stockQty}
                </p>
                {low ? (
                  <p className="mt-2">
                    <Badge tone={product.stockQty <= 0 ? "red" : "gold"}>
                      Seuil d&apos;alerte : {product.stockAlert}
                    </Badge>
                  </p>
                ) : null}
              </div>

              {/* Correction en un clic */}
              <div className="flex gap-2">
                {[-1, 1].map((delta) => (
                  <form key={delta} action={adjustStockAction} className="flex-1">
                    <input type="hidden" name="productId" value={id} />
                    <input type="hidden" name="delta" value={delta} />
                    <button
                      type="submit"
                      className={`${buttonGhostClass} w-full text-lg`}
                      disabled={delta < 0 && product.stockQty <= 0}
                    >
                      {delta > 0 ? "+1" : "−1"}
                    </button>
                  </form>
                ))}
              </div>

              <form action={adjustStockAction} className="space-y-2">
                <input type="hidden" name="productId" value={id} />
                <div className="flex gap-2">
                  <Input
                    name="quantity"
                    type="number"
                    placeholder="±10"
                    className="w-24"
                    required
                  />
                  <Input name="reason" placeholder="Motif (casse, inventaire…)" required />
                </div>
                <button type="submit" className={`${buttonClass} w-full`}>
                  Corriger le stock
                </button>
              </form>
            </div>
          </div>
        </Card>

        <Card title="Fiche">
          <dl>
            <DataRow label="Marque" value={product.brand ?? "—"} />
            <DataRow label="Emplacement" value={product.location ?? "—"} />
            <DataRow label="Catégorie" value={PRODUCT_CATEGORIES[product.category]} />
            <DataRow label="Seuil d'alerte" value={String(product.stockAlert)} />
            <DataRow label="Actif" value={product.active ? "Oui" : "Non"} />
          </dl>
          {product.notes ? (
            <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-600">
              {product.notes}
            </p>
          ) : null}
        </Card>
      </div>

      <Card title="Photos">
        {product.photos.length > 0 ? (
          <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {product.photos.map((photo) => (
              <li
                key={photo.id}
                className="overflow-hidden rounded-lg border border-slate-200"
              >
                <img
                  src={photo.url}
                  alt={photo.alt}
                  className="aspect-square w-full object-cover"
                />
                <form action={deleteProductPhotoAction} className="p-2">
                  <input type="hidden" name="id" value={photo.id} />
                  <button type="submit" className={`${buttonDangerClass} w-full`}>
                    Supprimer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}

        <form action={addProductPhotoAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="productId" value={id} />
          <Field label="Ajouter une photo" className="flex-1">
            <FileInput name="photo" required capture="environment" />
          </Field>
          <button type="submit" className={buttonClass}>
            Envoyer
          </button>
        </form>
      </Card>

      <Card title="Modifier la fiche">
        <form action={updateProductAction} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom" className="sm:col-span-2">
              <Input name="name" required defaultValue={product.name} />
            </Field>
            <Field label="Marque">
              <Input name="brand" defaultValue={product.brand ?? ""} />
            </Field>
            <Field label="Emplacement">
              <Input name="location" defaultValue={product.location ?? ""} />
            </Field>
            <Field label="Catégorie">
              <Select name="category" defaultValue={product.category}>
                {options(PRODUCT_CATEGORIES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Seuil d'alerte">
              <Input
                name="stockAlert"
                type="number"
                min={0}
                defaultValue={product.stockAlert}
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea name="notes" rows={3} defaultValue={product.notes ?? ""} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="active"
              defaultChecked={product.active}
              className="h-4 w-4 accent-gold-600"
            />
            Produit actif (proposé en intervention et au comptoir)
          </label>
          <button type="submit" className={buttonClass}>
            Enregistrer
          </button>
        </form>
      </Card>

      <Card title="Traçabilité — mouvements de stock">
        {product.movements.length === 0 ? (
          <Empty>Aucun mouvement enregistré.</Empty>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 text-right font-medium">Qté</th>
                  <th className="py-2 pr-3 text-right font-medium">Stock</th>
                  <th className="py-2 pr-3 font-medium">Motif / origine</th>
                  <th className="py-2 font-medium">Par</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {product.movements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="py-2 pr-3 whitespace-nowrap text-slate-600">
                      {formatDateTime(movement.createdAt)}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge tone={movement.quantity > 0 ? "green" : "red"}>
                        {MOVEMENT_TYPES[movement.type]}
                      </Badge>
                    </td>
                    <td
                      className={`py-2 pr-3 text-right font-semibold ${
                        movement.quantity > 0 ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {movement.quantity > 0 ? "+" : ""}
                      {movement.quantity}
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-600">
                      {movement.stockBefore} → {movement.stockAfter}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">
                      {movement.reception ? (
                        <Link
                          href={`/admin/receptions/${movement.reception.id}`}
                          className="text-gold-700 hover:underline"
                        >
                          {movement.reception.reference}
                        </Link>
                      ) : movement.intervention ? (
                        <Link
                          href={`/admin/interventions/${movement.intervention.id}`}
                          className="text-gold-700 hover:underline"
                        >
                          {movement.intervention.reference}
                        </Link>
                      ) : null}
                      {movement.reason ? (
                        <span className="block text-xs text-slate-400">
                          {movement.reason}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 whitespace-nowrap text-slate-500">
                      {movement.userLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
