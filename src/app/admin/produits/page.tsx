import Link from "next/link";

import {
  Badge,
  Card,
  Empty,
  Input,
  LinkButton,
  PageHeader,
  Select,
  Thumb,
  buttonClass,
} from "@/components/ui";
import { prisma } from "@/lib/db";
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
              { location: contains },
            ],
          }
        : {}),
      ...(category ? { category: category as never } : {}),
      ...(onlyAlerts ? { active: true } : {}),
    },
    include: { photos: { orderBy: { position: "asc" }, take: 1 } },
    orderBy: { name: "asc" },
    take: 200,
  });

  const visible = onlyAlerts
    ? products.filter((product) => product.stockQty <= product.stockAlert)
    : products;

  const totalUnits = products.reduce((sum, p) => sum + p.stockQty, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produits & stock"
        subtitle={`${visible.length} produit${visible.length > 1 ? "s" : ""} · ${totalUnits} pièces en rayon`}
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
          placeholder="Nom, marque, emplacement…"
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
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            name="alerte"
            value="1"
            defaultChecked={onlyAlerts}
            className="h-4 w-4 accent-gold-600"
          />
          Stock bas
        </label>
        <button type="submit" className={buttonClass}>
          Filtrer
        </button>
      </form>

      {visible.length === 0 ? (
        <Empty>
          Aucun produit.{" "}
          <Link href="/admin/produits/nouveau" className="text-gold-700 underline">
            En créer un
          </Link>
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((product) => (
            <li key={product.id}>
              <Link
                href={`/admin/produits/${product.id}`}
                className="flex items-center gap-3 rounded-card border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-gold-400"
              >
                <Thumb src={product.photos[0]?.url} alt="" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {product.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {product.brand ? `${product.brand} · ` : ""}
                    {product.location ?? product.sku}
                    {!product.active ? " · inactif" : ""}
                  </p>
                </div>
                <span className="shrink-0 text-right">
                  <span
                    className={`block text-2xl leading-none font-bold ${
                      product.stockQty <= 0
                        ? "text-red-600"
                        : product.stockQty <= product.stockAlert
                          ? "text-gold-700"
                          : "text-slate-900"
                    }`}
                  >
                    {product.stockQty}
                  </span>
                  <span className="text-[10px] tracking-wide text-slate-400 uppercase">
                    en stock
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {onlyAlerts && visible.length > 0 ? (
        <Card title="Rappel">
          <p className="text-sm text-slate-600">
            Ces produits sont à leur seuil d&apos;alerte ou en dessous. Le seuil
            se règle sur la fiche de chaque produit.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
