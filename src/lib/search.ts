import { prisma } from "@/lib/db";
import { normalizePlate } from "@/lib/format";

export type SearchScope = "tout" | "clients" | "vehicules" | "interventions" | "produits";

export const SEARCH_SCOPES: Record<SearchScope, string> = {
  tout: "Tout",
  clients: "Clients",
  vehicules: "Véhicules",
  interventions: "Interventions",
  produits: "Produits",
};

export type SearchResults = Awaited<ReturnType<typeof searchAll>>;

/**
 * Recherche multi-critères de l'atelier : une seule saisie interroge
 * la plaque, le nom, le téléphone, l'e-mail, la marque, le modèle, le VIN,
 * la référence d'intervention et le catalogue produits.
 */
export async function searchAll(query: string, scope: SearchScope = "tout") {
  const q = query.trim();

  if (q.length < 2) {
    return { query: q, scope, clients: [], vehicles: [], interventions: [], products: [] };
  }

  const contains = { contains: q, mode: "insensitive" as const };
  const plate = normalizePlate(q);
  const wants = (target: SearchScope) => scope === "tout" || scope === target;

  const [clients, vehicles, interventions, products] = await Promise.all([
    wants("clients")
      ? prisma.client.findMany({
          where: {
            OR: [
              { firstName: contains },
              { lastName: contains },
              { company: contains },
              { email: contains },
              { phone: { contains: q } },
              { phone2: { contains: q } },
              { city: contains },
              { vehicles: { some: { plate: { contains: plate } } } },
            ],
          },
          include: { _count: { select: { vehicles: true, interventions: true } } },
          orderBy: { lastName: "asc" },
          take: 25,
        })
      : Promise.resolve([]),

    wants("vehicules")
      ? prisma.vehicle.findMany({
          where: {
            OR: [
              ...(plate.length >= 2 ? [{ plate: { contains: plate } }] : []),
              { brand: contains },
              { model: contains },
              { vin: contains },
              { client: { lastName: contains } },
            ],
          },
          include: { client: true },
          orderBy: { updatedAt: "desc" },
          take: 25,
        })
      : Promise.resolve([]),

    wants("interventions")
      ? prisma.intervention.findMany({
          where: {
            OR: [
              { reference: contains },
              { title: contains },
              { description: contains },
              { pickupLocation: contains },
              { client: { lastName: contains } },
              ...(plate.length >= 2
                ? [{ vehicle: { plate: { contains: plate } } }]
                : []),
            ],
          },
          include: { client: true, vehicle: true },
          orderBy: { createdAt: "desc" },
          take: 25,
        })
      : Promise.resolve([]),

    wants("produits")
      ? prisma.product.findMany({
          where: {
            OR: [
              { sku: contains },
              { name: contains },
              { brand: contains },
              { location: contains },
            ],
          },
          orderBy: { name: "asc" },
          take: 25,
        })
      : Promise.resolve([]),
  ]);

  return { query: q, scope, clients, vehicles, interventions, products };
}
