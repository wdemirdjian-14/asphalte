/*
  Warnings:

  - You are about to drop the column `laborHours` on the `Intervention` table. All the data in the column will be lost.
  - You are about to drop the column `laborRate` on the `Intervention` table. All the data in the column will be lost.
  - You are about to drop the column `partsTotal` on the `Intervention` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Intervention` table. All the data in the column will be lost.
  - You are about to drop the column `barcode` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `purchasePrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `salePrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `vatRate` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceNumber` on the `Reception` table. All the data in the column will be lost.
  - You are about to drop the column `batch` on the `ReceptionLine` table. All the data in the column will be lost.
  - You are about to drop the column `expectedQty` on the `ReceptionLine` table. All the data in the column will be lost.
  - You are about to drop the column `unitCost` on the `ReceptionLine` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `unitPrice` on the `SaleLine` table. All the data in the column will be lost.
  - You are about to alter the column `quantity` on the `SaleLine` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Integer`.
  - You are about to drop the column `unitCost` on the `StockMovement` table. All the data in the column will be lost.
  - You are about to drop the `InterventionLine` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "VehicleDocumentKind" AS ENUM ('CARTE_GRISE', 'ASSURANCE', 'FACTURE', 'PHOTO', 'AUTRE');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('ENTRETIEN', 'FREINAGE', 'PNEUMATIQUE', 'MOTEUR', 'TRANSMISSION', 'ELECTRIQUE', 'CONTROLE', 'AUTRE');

-- DropForeignKey
ALTER TABLE "InterventionLine" DROP CONSTRAINT "InterventionLine_interventionId_fkey";

-- DropForeignKey
ALTER TABLE "InterventionLine" DROP CONSTRAINT "InterventionLine_productId_fkey";

-- AlterTable
ALTER TABLE "Intervention" DROP COLUMN "laborHours",
DROP COLUMN "laborRate",
DROP COLUMN "partsTotal",
DROP COLUMN "totalAmount";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "barcode",
DROP COLUMN "description",
DROP COLUMN "purchasePrice",
DROP COLUMN "salePrice",
DROP COLUMN "vatRate",
ADD COLUMN     "notes" TEXT,
ALTER COLUMN "category" SET DEFAULT 'AUTRE';

-- AlterTable
ALTER TABLE "Reception" DROP COLUMN "invoiceNumber";

-- AlterTable
ALTER TABLE "ReceptionLine" DROP COLUMN "batch",
DROP COLUMN "expectedQty",
DROP COLUMN "unitCost";

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "totalAmount";

-- AlterTable
ALTER TABLE "SaleLine" DROP COLUMN "unitPrice",
ALTER COLUMN "quantity" SET DEFAULT 1,
ALTER COLUMN "quantity" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "StockMovement" DROP COLUMN "unitCost";

-- DropTable
DROP TABLE "InterventionLine";

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" "VehicleDocumentKind" NOT NULL DEFAULT 'CARTE_GRISE',
    "label" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionPart" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "productId" TEXT,
    "label" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "InterventionPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTask" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL DEFAULT 'ENTRETIEN',
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionService" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "serviceTaskId" TEXT,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterventionService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleDocument_vehicleId_kind_idx" ON "VehicleDocument"("vehicleId", "kind");

-- CreateIndex
CREATE INDEX "InterventionPart_interventionId_idx" ON "InterventionPart"("interventionId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTask_name_key" ON "ServiceTask"("name");

-- CreateIndex
CREATE INDEX "ServiceTask_category_position_idx" ON "ServiceTask"("category", "position");

-- CreateIndex
CREATE INDEX "InterventionService_interventionId_idx" ON "InterventionService"("interventionId");

-- CreateIndex
CREATE UNIQUE INDEX "InterventionService_interventionId_label_key" ON "InterventionService"("interventionId", "label");

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionPart" ADD CONSTRAINT "InterventionPart_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionPart" ADD CONSTRAINT "InterventionPart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionService" ADD CONSTRAINT "InterventionService_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionService" ADD CONSTRAINT "InterventionService_serviceTaskId_fkey" FOREIGN KEY ("serviceTaskId") REFERENCES "ServiceTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
