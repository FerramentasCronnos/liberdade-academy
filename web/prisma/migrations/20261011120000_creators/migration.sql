-- Criadores do TikTok Shop (Bank Offers): ranking, vídeos, produtos e favoritos.
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'US',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "handle" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "status" TEXT,
    "bio" TEXT,
    "contactEmail" TEXT,
    "contactWhatsapp" TEXT,
    "contactInstagram" TEXT,
    "contactFacebook" TEXT,
    "rank" INTEGER,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenueGrowth" DOUBLE PRECISION,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION,
    "videoRevenue" DOUBLE PRECISION,
    "liveRevenue" DOUBLE PRECISION,
    "videoViews" DOUBLE PRECISION,
    "liveViews" DOUBLE PRECISION,
    "videoGpm" DOUBLE PRECISION,
    "liveGpm" DOUBLE PRECISION,
    "followers" INTEGER,
    "newFollowers" INTEGER,
    "videoCount" INTEGER,
    "liveCount" INTEGER,
    "shopCount" INTEGER,
    "productCount" INTEGER,
    "debutDate" TIMESTAMP(3),
    "engagementRate" DOUBLE PRECISION,
    "trend" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "rankSyncedAt" TIMESTAMP(3),
    "profileSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Creator_region_externalId_key" ON "Creator"("region", "externalId");
CREATE INDEX "Creator_active_rank_idx" ON "Creator"("active", "rank");
CREATE INDEX "Creator_active_revenue_idx" ON "Creator"("active", "revenue");

CREATE TABLE "CreatorVideo" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "isAd" BOOLEAN NOT NULL DEFAULT false,
    "adsRoas" DOUBLE PRECISION,
    "publishedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreatorVideo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CreatorVideo_creatorId_videoId_key" ON "CreatorVideo"("creatorId", "videoId");
CREATE INDEX "CreatorVideo_creatorId_revenue_idx" ON "CreatorVideo"("creatorId", "revenue");
ALTER TABLE "CreatorVideo" ADD CONSTRAINT "CreatorVideo_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CreatorProduct" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "productExternalId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenueGrowth" DOUBLE PRECISION,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION,
    "commission" INTEGER,
    "launchDate" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreatorProduct_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CreatorProduct_creatorId_productExternalId_key" ON "CreatorProduct"("creatorId", "productExternalId");
CREATE INDEX "CreatorProduct_creatorId_revenue_idx" ON "CreatorProduct"("creatorId", "revenue");
ALTER TABLE "CreatorProduct" ADD CONSTRAINT "CreatorProduct_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CreatorFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreatorFavorite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CreatorFavorite_userId_creatorId_key" ON "CreatorFavorite"("userId", "creatorId");
ALTER TABLE "CreatorFavorite" ADD CONSTRAINT "CreatorFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorFavorite" ADD CONSTRAINT "CreatorFavorite_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
