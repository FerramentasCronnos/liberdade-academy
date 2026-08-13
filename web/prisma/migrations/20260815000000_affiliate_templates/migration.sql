-- Contas de afiliado, links gerados e templates de oferta.

CREATE TABLE "AffiliateAccount" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "publicId"    TEXT,
    "secret"      TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AffiliateAccount_userId_marketplace_key" ON "AffiliateAccount"("userId", "marketplace");

CREATE TABLE "AffiliateLink" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "marketplace"  TEXT NOT NULL,
    "originalUrl"  TEXT NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "title"        TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateLink_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AffiliateLink_userId_createdAt_idx" ON "AffiliateLink"("userId", "createdAt");

CREATE TABLE "OfferTemplate" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "marketplace" TEXT NOT NULL DEFAULT 'shopee',
    "body"        TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferTemplate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OfferTemplate_userId_idx" ON "OfferTemplate"("userId");

ALTER TABLE "AffiliateAccount" ADD CONSTRAINT "AffiliateAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliateLink" ADD CONSTRAINT "AffiliateLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferTemplate" ADD CONSTRAINT "OfferTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
