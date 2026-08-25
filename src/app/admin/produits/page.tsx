import Link from "next/link";

import {
  Badge,
  Card,
  Empty,
  Input,
  LinkButton,
  PageHeader,
  Select,
  buttonClass,
} from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { PRODUCT_CATEGORIES, options } from "@/lib/labels";

export const dynamic = "force-dynamic";

export const metadata = { title: "Produits & stock" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; alerte?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const category =
    params.category && params.category in PRODUCT_CATEGORIES ? params.category : "";
  const onlyAlerts = params.alerte === "1";

  const contains = { contains: query, mode: "insensitive" as const };

  const products = await prisma.product.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { sku: contains },
              { name: contains },
              { brand: contains },
              { barcode: { contains: query } },
              { location: contains },
            ],
          }
        : {}),
      ...(category ? { category: category as never } : {}),
    },
    include: { photos: { orderBy: { position: "asc" }, take: 1 } },
    orderBy: { name: "asc" },
    take: 200,
  });

  const visible = onlyAlerts
    ? products.filter((product) => product.stockQty <= product.stockAlert)
    : products;

  const stockValue = products.reduce(
    (sum, product) => sum + product.stockQty * Number(product.purchasePrice),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produits & stock"
        subtitle={`${visible.length} référence${visible.length > 1 ? "s" : ""} · valeur du stock ${formatPrice(stockValue)}`}
        action={
          <div className="flex gap-2">
            <LinkButton href="/admin/receptions">Réceptions</LinkButton>
            <LinkButton href="/admin/produits/nouveau" variant="primary">
              Nouveau produit
            </LinkButton>
          </div>
        }
      />

      <form method="get" className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Référence, nom, marque, code-barres, emplacement…"
          className="sm:flex-1"
        />
        <Select name="category" defaultValue={category} className="sm:w-44">
          <option value="">Toutes catégories</option>
          {options(PRODUCT_CATEGORIES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 rounded-lg border border-ink-700 px-3 py-2.5 text-sm text-ink-200">
          <input
            type="checkbox"
            name="alerte"
            value="1"
            defaultChecked={onlyAlerts}
            className="accent-gold-500"
          />
          Sous le seuil
        </label>
        <button type="submit" className={buttonClass}>
          Filtrer
        </button>
      </form>

      {visible.length === 0 ? (
        <Empty>Aucun produit ne correspond à ces critères.</Empty>
      ) : (
        <Card>
          <ul className="divide-y divide-ink-800">
            {visible.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/admin/produits/${product.id}`}
                  className="flex items-center gap-3 py-3 hover:text-gold-300"
                >
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-ink-800 bg-ink-950">
                    {product.photos[0] ? (
                      <img
                        src={product.photos[0].url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px] text-ink-600">
                        photo
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-100">
                      {product.name}
                      {!product.active ? (
                        <span className="ml-2 text-xs text-ink-500">(inactif)</span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-ink-400">
                      {product.sku}
                      {product.brand ? ` · ${product.brand}` : ""}
                      {product.location ? ` · ${product.location}` : ""} ·{" "}
                      {formatPrice(product.salePrice)}
                    </p>
                  </div>
                  <Badge
                    tone={
                      product.stockQty <= 0
                        ? "red"
                        : product.stockQty <= product.stockAlert
                          ? "gold"
                          : "neutral"
                    }
                  >
                    {product.stockQty} en stock
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
