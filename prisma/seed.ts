import { PrismaClient, Prisma } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

const d = (value: string | number) => new Prisma.Decimal(value);

async function main() {
  // --- Compte administrateur ------------------------------------------------
  const email = (process.env.SEED_ADMIN_EMAIL ?? "contact@asphalte.fr").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "asphalte2002";
  const name = process.env.SEED_ADMIN_NAME ?? "Atelier Asphalte";

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { name },
    create: { email, name, passwordHash: hashPassword(password), role: "ADMIN" },
  });
  console.log(`Administrateur : ${admin.email}`);

  if (process.env.SEED_DEMO === "false") {
    console.log("Jeu de démonstration ignoré (SEED_DEMO=false).");
    return;
  }

  if ((await prisma.client.count()) > 0) {
    console.log("Des données existent déjà : démonstration non rejouée.");
    return;
  }

  // --- Fournisseurs ---------------------------------------------------------
  const [motoParts, pneuExpress] = await Promise.all([
    prisma.supplier.create({
      data: { name: "Moto Parts Diffusion", phone: "01 46 00 00 01", email: "commandes@motoparts.example" },
    }),
    prisma.supplier.create({
      data: { name: "Pneu Express Pro", phone: "01 46 00 00 02" },
    }),
  ]);

  // --- Catalogue produits ---------------------------------------------------
  const products = await Promise.all(
    [
      { sku: "PLQ-AV-STD", name: "Plaquettes de frein avant (jeu)", category: "PIECE" as const, brand: "Brembo", purchasePrice: 18.4, salePrice: 39.9, stockQty: 12, stockAlert: 4, location: "R1-A3" },
      { sku: "HUI-10W40-4L", name: "Huile moteur 10W40 synthèse — 4 L", category: "LUBRIFIANT" as const, brand: "Motul", purchasePrice: 26.5, salePrice: 54.9, stockQty: 8, stockAlert: 3, location: "R2-B1" },
      { sku: "PNE-120-70-17", name: "Pneu avant 120/70-17", category: "PNEU" as const, brand: "Michelin", purchasePrice: 88, salePrice: 149, stockQty: 4, stockAlert: 2, location: "Stock pneus" },
      { sku: "BAT-YTX12", name: "Batterie YTX12-BS", category: "PIECE" as const, brand: "Yuasa", purchasePrice: 42, salePrice: 89, stockQty: 2, stockAlert: 3, location: "R1-C2" },
      { sku: "KIT-CHAINE-525", name: "Kit chaîne 525 (couronne + pignon)", category: "PIECE" as const, brand: "DID", purchasePrice: 96, salePrice: 189, stockQty: 3, stockAlert: 2, location: "R3-A1" },
      { sku: "ACC-TOPCASE-39", name: "Top-case 39 L avec platine", category: "ACCESSOIRE" as const, brand: "Shad", purchasePrice: 74, salePrice: 139, stockQty: 5, stockAlert: 2, location: "Vitrine" },
      { sku: "CON-FILTRE-HUILE", name: "Filtre à huile universel", category: "CONSOMMABLE" as const, purchasePrice: 4.2, salePrice: 12.5, stockQty: 24, stockAlert: 10, location: "R1-A1" },
    ].map((p) =>
      prisma.product.create({
        data: {
          ...p,
          purchasePrice: d(p.purchasePrice),
          salePrice: d(p.salePrice),
        },
      }),
    ),
  );

  const bySku = Object.fromEntries(products.map((p) => [p.sku, p]));

  // Stock initial tracé comme un inventaire d'ouverture
  await prisma.stockMovement.createMany({
    data: products.map((product) => ({
      productId: product.id,
      type: "INVENTAIRE" as const,
      quantity: product.stockQty,
      stockBefore: 0,
      stockAfter: product.stockQty,
      reason: "Inventaire d'ouverture",
      userId: admin.id,
      userLabel: admin.name,
    })),
  });

  // --- Clients, véhicules, interventions, ventes ----------------------------
  const year = new Date().getFullYear();

  const dupont = await prisma.client.create({
    data: {
      firstName: "Marc",
      lastName: "Dupont",
      phone: "06 12 34 56 78",
      email: "marc.dupont@example.com",
      address: "12 rue de Paris",
      postalCode: "92100",
      city: "Boulogne-Billancourt",
      vehicles: {
        create: [
          {
            plate: "AB123CD",
            plateDisplay: "AB-123-CD",
            brand: "Yamaha",
            model: "MT-07",
            year: 2019,
            displacement: 689,
            color: "Bleu",
            mileage: 34200,
          },
        ],
      },
    },
    include: { vehicles: true },
  });

  const leroy = await prisma.client.create({
    data: {
      firstName: "Sophie",
      lastName: "Leroy",
      phone: "06 98 76 54 32",
      city: "Issy-les-Moulineaux",
      postalCode: "92130",
      vehicles: {
        create: [
          {
            plate: "EF456GH",
            plateDisplay: "EF-456-GH",
            brand: "Honda",
            model: "PCX 125",
            year: 2022,
            displacement: 125,
            color: "Noir",
            mileage: 9800,
          },
        ],
      },
    },
    include: { vehicles: true },
  });

  const depannage = await prisma.intervention.create({
    data: {
      reference: `DEP-${year}-0001`,
      type: "DEPANNAGE",
      status: "TERMINE",
      title: "Panne d'allumage — remorquage depuis le pont de Sèvres",
      description:
        "Moto immobilisée, batterie hors service. Remorquage jusqu'à l'atelier puis remplacement de la batterie.",
      pickupLocation: "Pont de Sèvres, Boulogne-Billancourt",
      dropoffLocation: "Atelier — 31 bis route de la Reine",
      clientId: dupont.id,
      vehicleId: dupont.vehicles[0].id,
      completedAt: new Date(),
      mileage: 34200,
      laborHours: d(1.5),
      laborRate: d(70),
      lines: {
        create: [
          {
            productId: bySku["BAT-YTX12"].id,
            label: "Batterie YTX12-BS",
            quantity: d(1),
            unitPrice: d(89),
          },
        ],
      },
    },
  });

  await prisma.intervention.update({
    where: { id: depannage.id },
    data: { partsTotal: d(89), totalAmount: d(89 + 1.5 * 70) },
  });

  await prisma.$transaction([
    prisma.product.update({
      where: { id: bySku["BAT-YTX12"].id },
      data: { stockQty: { decrement: 1 } },
    }),
    prisma.stockMovement.create({
      data: {
        productId: bySku["BAT-YTX12"].id,
        type: "INTERVENTION",
        quantity: -1,
        stockBefore: bySku["BAT-YTX12"].stockQty,
        stockAfter: bySku["BAT-YTX12"].stockQty - 1,
        reason: `Montée sur ${depannage.reference}`,
        interventionId: depannage.id,
        userId: admin.id,
        userLabel: admin.name,
      },
    }),
  ]);

  await prisma.intervention.create({
    data: {
      reference: `DEP-${year}-0002`,
      type: "ENTRETIEN",
      status: "EN_COURS",
      title: "Révision 10 000 km",
      clientId: leroy.id,
      vehicleId: leroy.vehicles[0].id,
      mileage: 9800,
      laborHours: d(2),
      laborRate: d(70),
      totalAmount: d(140),
    },
  });

  const sale = await prisma.sale.create({
    data: {
      reference: `VTE-${year}-0001`,
      clientId: dupont.id,
      totalAmount: d(139),
      lines: {
        create: [
          {
            productId: bySku["ACC-TOPCASE-39"].id,
            label: "Top-case 39 L avec platine",
            quantity: d(1),
            unitPrice: d(139),
          },
        ],
      },
    },
  });

  await prisma.$transaction([
    prisma.product.update({
      where: { id: bySku["ACC-TOPCASE-39"].id },
      data: { stockQty: { decrement: 1 } },
    }),
    prisma.stockMovement.create({
      data: {
        productId: bySku["ACC-TOPCASE-39"].id,
        type: "VENTE",
        quantity: -1,
        stockBefore: bySku["ACC-TOPCASE-39"].stockQty,
        stockAfter: bySku["ACC-TOPCASE-39"].stockQty - 1,
        reason: `Vente ${sale.reference}`,
        saleId: sale.id,
        userId: admin.id,
        userLabel: admin.name,
      },
    }),
  ]);

  // --- Un colis en attente de validation ------------------------------------
  await prisma.reception.create({
    data: {
      reference: `REC-${year}-0001`,
      status: "BROUILLON",
      supplierId: motoParts.id,
      carrier: "Chronopost",
      trackingNumber: "XY123456789FR",
      packageCount: 2,
      receivedById: admin.id,
      notes: "Colis reçu le matin, à contrôler avant mise en rayon.",
      lines: {
        create: [
          { productId: bySku["PLQ-AV-STD"].id, expectedQty: 10, quantity: 10, unitCost: d(18.4) },
          { productId: bySku["CON-FILTRE-HUILE"].id, expectedQty: 20, quantity: 18, unitCost: d(4.2), notes: "2 manquants sur le bon de livraison" },
          { productId: bySku["HUI-10W40-4L"].id, expectedQty: 6, quantity: 6, unitCost: d(26.5) },
        ],
      },
    },
  });

  await prisma.reception.create({
    data: {
      reference: `REC-${year}-0002`,
      status: "BROUILLON",
      supplierId: pneuExpress.id,
      carrier: "DPD",
      packageCount: 1,
      receivedById: admin.id,
      lines: {
        create: [
          { productId: bySku["PNE-120-70-17"].id, expectedQty: 4, quantity: 4, unitCost: d(88) },
        ],
      },
    },
  });

  // --- Un message reçu depuis le site ---------------------------------------
  await prisma.contactMessage.create({
    data: {
      name: "Julien Bernard",
      phone: "07 45 12 33 21",
      plate: "IJ789KL",
      subject: "Dépannage",
      message:
        "Scooter en panne devant le 40 route de la Reine, il ne démarre plus. Possible de venir le chercher aujourd'hui ?",
    },
  });

  console.log("Jeu de démonstration créé.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
