-- Métricas de venda (Kalodata) e galeria de fotos no produto.
ALTER TABLE "Product"
  ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "revenue" DOUBLE PRECISION,
  ADD COLUMN "revenueGrowth" DOUBLE PRECISION,
  ADD COLUMN "unitPrice" DOUBLE PRECISION,
  ADD COLUMN "videoRevenue" DOUBLE PRECISION,
  ADD COLUMN "liveRevenue" DOUBLE PRECISION,
  ADD COLUMN "reviewCount" INTEGER,
  ADD COLUMN "creatorCount" INTEGER,
  ADD COLUMN "videoCount" INTEGER,
  ADD COLUMN "launchDate" TIMESTAMP(3),
  ADD COLUMN "revenueTrend" JSONB;
