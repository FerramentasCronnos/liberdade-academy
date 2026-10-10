-- Vídeos de referência por produto (Kalodata) e marca de renovação no produto.
ALTER TABLE "Product" ADD COLUMN "videosSyncedAt" TIMESTAMP(3);

CREATE TABLE "ProductVideo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "creatorHandle" TEXT NOT NULL,
    "creatorId" TEXT,
    "thumbnail" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "isAd" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVideo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductVideo_productId_videoId_key" ON "ProductVideo"("productId", "videoId");
CREATE INDEX "ProductVideo_productId_revenue_idx" ON "ProductVideo"("productId", "revenue");

ALTER TABLE "ProductVideo" ADD CONSTRAINT "ProductVideo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
