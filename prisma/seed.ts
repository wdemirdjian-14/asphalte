import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

/**
 * Catalogue des prestations proposées à l'atelier. Ce sont les cases à
 * cocher d'une révision : l'objectif est d'enregistrer une maintenance en
 * quelques clics, sans rien saisir au clavier.
 */
const SERVICE_TASKS: { name: string; category: string }[] = [
  { name: "Vidange moteur", category: "ENTRETIEN" },
  { name: "Filtre à huile", category: "ENTRETIEN" },
  { name: "Filtre à air", category: "ENTRETIEN" },
  { name: "Bougie(s)", category: "ENTRETIEN" },
  { name: "Contrôle des niveaux", category: "ENTRETIEN" },
  { name: "Graissage général", category: "ENTRETIEN" },

  { name: "Plaquettes avant", category: "FREINAGE" },
  { name: "Plaquettes arrière", category: "FREINAGE" },
  { name: "Disque avant", category: "FREINAGE" },
  { name: "Disque arrière", category: "FREINAGE" },
  { name: "Purge liquide de frein", category: "FREINAGE" },

  { name: "Pneu avant", category: "PNEUMATIQUE" },
  { name: "Pneu arrière", category: "PNEUMATIQUE" },
  { name: "Contrôle des pressions", category: "PNEUMATIQUE" },
  { name: "Équilibrage", category: "PNEUMATIQUE" },

  { name: "Chaîne, couronne et pignon", category: "TRANSMISSION" },
  { name: "Tension de chaîne", category: "TRANSMISSION" },
  { name: "Graissage de chaîne", category: "TRANSMISSION" },
  { name: "Courroie de transmission", category: "TRANSMISSION" },
  { name: "Galets de variateur", category: "TRANSMISSION" },

  { name: "Réglage des soupapes", category: "MOTEUR" },
  { name: "Nettoyage injection / carburateur", category: "MOTEUR" },
  { name: "Liquide de refroidissement", category: "MOTEUR" },

  { name: "Batterie", category: "ELECTRIQUE" },
  { name: "Ampoules", category: "ELECTRIQUE" },
  { name: "Diagnostic électrique", category: "ELECTRIQUE" },

  { name: "Contrôle général", category: "CONTROLE" },
  { name: "Contrôle avant grand trajet", category: "CONTROLE" },
  { name: "Serrage général", category: "CONTROLE" },
];

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

  // --- Catalogue des prestations (toujours installé) ------------------------
  let position = 0;
  for (const task of SERVICE_TASKS) {
    position += 1;
    await prisma.serviceTask.upsert({
      where: { name: task.name },
      update: { category: task.category as never, position },
      create: { name: task.name, category: task.category as never, position },
    });
  }
  console.log(`Prestations au catalogue : ${SERVICE_TASKS.length}`);

  if (process.env.SEED_DEMO === "false") {
    console.log("Jeu de démonstration ignoré (SEED_DEMO=false).");
    return;
  }

  if ((await prisma.client.count()) > 0) {
    console.log("Des données existent déjà : démonstration non rejouée.");
    return;
  }

  // --- Fournisseurs ---------------------------------------------------------
  const motoParts = await prisma.supplier.create({
    data: { name: "Moto Parts Diffusion", phone: "01 46 00 00 01" },
  });
  await prisma.supplier.create({
    data: { name: "Pneu Express Pro", phone: "01 46 00 00 02" },
  });

  // --- Catalogue produits ---------------------------------------------------
  const products = await Promise.all(
    [
      { sku: "P-0001", name: "Plaquettes de frein avant", category: "PIECE" as const, brand: "Brembo", stockQty: 12, stockAlert: 4, location: "R1-A3" },
      { sku: "P-0002", name: "Huile moteur 10W40 — 4 L", category: "LUBRIFIANT" as const, brand: "Motul", stockQty: 8, stockAlert: 3, location: "R2-B1" },
      { sku: "P-0003", name: "Pneu avant 120/70-17", category: "PNEU" as const, brand: "Michelin", stockQty: 4, stockAlert: 2, location: "Stock pneus" },
      { sku: "P-0004", name: "Batterie YTX12-BS", category: "PIECE" as const, brand: "Yuasa", stockQty: 2, stockAlert: 3, location: "R1-C2" },
      { sku: "P-0005", name: "Kit chaîne 525", category: "PIECE" as const, brand: "DID", stockQty: 3, stockAlert: 2, location: "R3-A1" },
      { sku: "P-0006", name: "Top-case 39 L", category: "ACCESSOIRE" as const, brand: "Shad", stockQty: 5, stockAlert: 2, location: "Vitrine" },
      { sku: "P-0007", name: "Filtre à huile universel", category: "CONSOMMABLE" as const, stockQty: 24, stockAlert: 10, location: "R1-A1" },
    ].map((p) => prisma.product.create({ data: p })),
  );

  const bySku = Object.fromEntries(products.map((p) => [p.sku, p]));

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

  // --- Clients et véhicules -------------------------------------------------
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

  const year = new Date().getFullYear();

  // --- Un dépannage terminé, avec une pièce montée --------------------------
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
      parts: {
        create: [
          { productId: bySku["P-0004"].id, label: "Batterie YTX12-BS", quantity: 1 },
        ],
      },
      services: {
        create: [{ label: "Batterie" }, { label: "Contrôle général" }],
      },
    },
  });

  await prisma.$transaction([
    prisma.product.update({
      where: { id: bySku["P-0004"].id },
      data: { stockQty: { decrement: 1 } },
    }),
    prisma.stockMovement.create({
      data: {
        productId: bySku["P-0004"].id,
        type: "INTERVENTION",
        quantity: -1,
        stockBefore: bySku["P-0004"].stockQty,
        stockAfter: bySku["P-0004"].stockQty - 1,
        reason: `Montée sur ${depannage.reference}`,
        interventionId: depannage.id,
        userId: admin.id,
        userLabel: admin.name,
      },
    }),
  ]);

  // --- Une révision en cours ------------------------------------------------
  await prisma.intervention.create({
    data: {
      reference: `DEP-${year}-0002`,
      type: "ENTRETIEN",
      status: "EN_COURS",
      title: "Révision 10 000 km",
      clientId: leroy.id,
      vehicleId: leroy.vehicles[0].id,
      mileage: 9800,
      services: {
        create: [
          { label: "Vidange moteur" },
          { label: "Filtre à huile" },
          { label: "Contrôle des pressions" },
        ],
      },
    },
  });

  // --- Un accessoire remis au comptoir --------------------------------------
  const sale = await prisma.sale.create({
    data: {
      reference: `VTE-${year}-0001`,
      clientId: dupont.id,
      lines: {
        create: [{ productId: bySku["P-0006"].id, label: "Top-case 39 L", quantity: 1 }],
      },
    },
  });

  await prisma.$transaction([
    prisma.product.update({
      where: { id: bySku["P-0006"].id },
      data: { stockQty: { decrement: 1 } },
    }),
    prisma.stockMovement.create({
      data: {
        productId: bySku["P-0006"].id,
        type: "VENTE",
        quantity: -1,
        stockBefore: bySku["P-0006"].stockQty,
        stockAfter: bySku["P-0006"].stockQty - 1,
        reason: `Remis au client — ${sale.reference}`,
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
          { productId: bySku["P-0001"].id, quantity: 10 },
          { productId: bySku["P-0007"].id, quantity: 18, notes: "2 manquants sur le bon de livraison" },
          { productId: bySku["P-0002"].id, quantity: 6 },
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
