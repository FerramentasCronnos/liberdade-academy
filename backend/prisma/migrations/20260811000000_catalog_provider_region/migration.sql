-- Catálogo multi-provider e multi-região (BR / US).
-- externalId deixa de ser único global: o mesmo id pode existir em providers
-- e regiões diferentes. A chave passa a ser (provider, region, externalId).

-- DropIndex
DROP INDEX IF EXISTS "Product_externalId_key";

-- AlterTable
ALTER TABLE "Product"
  ADD COLUMN "provider"   TEXT NOT NULL DEFAULT 'seed',
  ADD COLUMN "region"     TEXT NOT NULL DEFAULT 'BR',
  ADD COLUMN "currency"   TEXT NOT NULL DEFAULT 'BRL',
  ADD COLUMN "productUrl" TEXT,
  ADD COLUMN "syncedAt"   TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Product_provider_region_externalId_key"
  ON "Product"("provider", "region", "externalId");

-- CreateIndex
CREATE INDEX "Product_region_category_active_idx"
  ON "Product"("region", "category", "active");

-- CreateIndex
CREATE INDEX "Product_region_isViral_salesCount_idx"
  ON "Product"("region", "isViral", "salesCount");
