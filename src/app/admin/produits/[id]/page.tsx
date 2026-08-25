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
  addProductPhotoAction,
  adjustStockAction,
  deleteProductPhotoAction,
  updateProductAction,
} from "@/lib/actions/products";
import { prisma } from "@/lib/db";
import { formatDateTime, formatPrice } from "@/lib/format";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        subtitle={`${product.sku} · ${PRODUCT_CATEGORIES[product.category]}`}
        action={
          <div className="flex items-center gap-2">
            <Badge
              tone={
                product.stockQty <= 0
                  ? "red"
                  : product.stockQty <= product.stockAlert
                    ? "gold"
                    : "green"
              }
            >
              {product.stockQty} en stock
            </Badge>
            <LinkButton href="/admin/produits">Catalogue</LinkButton>
          </div>
        }
      />

      <Flash error={error} ok={ok} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Fiche">
          <dl>
            <DataRow label="Marque" value={product.brand ?? "—"} />
            <DataRow label="Emplacement" value={product.location ?? "—"} />
            <DataRow label="Code-barres" value={product.barcode ?? "—"} />
            <DataRow label="Prix d'achat" value={formatPrice(product.purchasePrice)} />
            <DataRow label="Prix de vente" value={formatPrice(product.salePrice)} />
            <DataRow label="TVA" value={`${Number(product.vatRate)} %`} />
            <DataRow label="Seuil d'alerte" value={String(product.stockAlert)} />
            <DataRow
              label="Valeur du stock"
              value={formatPrice(product.stockQty * Number(product.purchasePrice))}
            />
          </dl>
        </Card>

        <Card title="Photos" className="lg:col-span-2">
          {product.photos.length === 0 ? (
            <Empty>Aucune photo pour ce produit.</Empty>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {product.photos.map((photo) => (
                <li key={photo.id} className="overflow-hidden rounded-lg border border-ink-800">
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
          )}

          <form
            action={addProductPhotoAction}
            className="mt-4 space-y-3 rounded-lg border border-ink-800 p-3"
          >
            <input type="hidden" name="productId" value={id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Photo" hint="JPEG, PNG, WebP ou AVIF — 8 Mo maximum">
                <input
                  type="file"
                  name="photo"
                  accept="image/*"
                  required
                  capture="environment"
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-200 file:mr-3 file:rounded file:border-0 file:bg-gold-500 file:px-3 file:py-1.5 file:text-ink-950"
                />
              </Field>
              <Field label="Description (accessibilité)">
                <Input name="alt" placeholder="Plaquettes neuves dans leur boîte" />
              </Field>
            </div>
            <button type="submit" className={buttonClass}>
              Ajouter la photo
            </button>
          </form>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Ajuster le stock">
          <form action={adjustStockAction} className="space-y-3">
            <input type="hidden" name="productId" value={id} />
            <p className="text-xs text-ink-400">
              Quantité positive pour une entrée, négative pour une sortie. Le
              motif est obligatoire : il reste attaché au mouvement.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Quantité">
                <Input name="quantity" type="number" required placeholder="-1" />
              </Field>
              <Field label="Motif" className="sm:col-span-2">
                <Input name="reason" required placeholder="Casse au montage" />
              </Field>
            </div>
            <button type="submit" className={buttonClass}>
              Enregistrer le mouvement
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
              <Field label="Catégorie">
                <Select name="category" defaultValue={product.category}>
                  {options(PRODUCT_CATEGORIES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Marque">
                <Input name="brand" defaultValue={product.brand ?? ""} />
              </Field>
              <Field label="Emplacement">
                <Input name="location" defaultValue={product.location ?? ""} />
              </Field>
              <Field label="Code-barres">
                <Input name="barcode" defaultValue={product.barcode ?? ""} />
              </Field>
              <Field label="Prix d'achat HT (€)">
                <Input
                  name="purchasePrice"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={Number(product.purchasePrice)}
                />
              </Field>
              <Field label="Prix de vente TTC (€)">
                <Input
                  name="salePrice"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={Number(product.salePrice)}
                />
              </Field>
              <Field label="TVA (%)">
                <Input
                  name="vatRate"
                  type="number"
                  step="0.1"
                  min={0}
                  defaultValue={Number(product.vatRate)}
                />
              </Field>
              <Field label="Seuil d'alerte">
                <Input
                  name="stockAlert"
                  type="number"
                  min={0}
                  defaultValue={product.stockAlert}
                />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <Textarea name="description" rows={3} defaultValue={product.description ?? ""} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-200">
              <input
                type="checkbox"
                name="active"
                defaultChecked={product.active}
                className="accent-gold-500"
              />
              Produit actif (proposé à la vente et en intervention)
            </label>
            <button type="submit" className={buttonClass}>
              Enregistrer
            </button>
          </form>
        </Card>
      </div>

      <Card title="Traçabilité — mouvements de stock">
        {product.movements.length === 0 ? (
          <Empty>Aucun mouvement enregistré.</Empty>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-ink-800 text-left text-xs tracking-wide text-ink-400 uppercase">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 text-right font-medium">Qté</th>
                  <th className="py-2 pr-3 text-right font-medium">Stock</th>
                  <th className="py-2 pr-3 font-medium">Motif / origine</th>
                  <th className="py-2 font-medium">Par</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800/70">
                {product.movements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="py-2 pr-3 whitespace-nowrap text-ink-300">
                      {formatDateTime(movement.createdAt)}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge tone={movement.quantity > 0 ? "green" : "red"}>
                        {MOVEMENT_TYPES[movement.type]}
                      </Badge>
                    </td>
                    <td
                      className={`py-2 pr-3 text-right font-medium ${
                        movement.quantity > 0 ? "text-emerald-300" : "text-red-300"
                      }`}
                    >
                      {movement.quantity > 0 ? "+" : ""}
                      {movement.quantity}
                    </td>
                    <td className="py-2 pr-3 text-right text-ink-300">
                      {movement.stockBefore} → {movement.stockAfter}
                    </td>
                    <td className="py-2 pr-3 text-ink-300">
                      {movement.reception ? (
                        <Link
                          href={`/admin/receptions/${movement.reception.id}`}
                          className="text-gold-300 hover:underline"
                        >
                          {movement.reception.reference}
                        </Link>
                      ) : movement.intervention ? (
                        <Link
                          href={`/admin/interventions/${movement.intervention.id}`}
                          className="text-gold-300 hover:underline"
                        >
                          {movement.intervention.reference}
                        </Link>
                      ) : null}
                      {movement.reason ? (
                        <span className="block text-xs text-ink-500">
                          {movement.reason}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 whitespace-nowrap text-ink-400">
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
