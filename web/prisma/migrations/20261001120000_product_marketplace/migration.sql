-- Marketplace de origem do produto (o catálogo passa a ter Amazon e Shopee).
ALTER TABLE "Product" ADD COLUMN "marketplace" TEXT NOT NULL DEFAULT 'tiktok_shop';
CREATE INDEX "Product_marketplace_active_createdAt_idx" ON "Product"("marketplace", "active", "createdAt");
