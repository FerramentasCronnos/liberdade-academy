-- Baú de Anúncios: criativos em imagem publicados pela administração.

CREATE TABLE "AdCreative" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "category"    TEXT NOT NULL DEFAULT 'geral',
    "image"       TEXT NOT NULL,
    "notes"       TEXT,
    "active"      BOOLEAN NOT NULL DEFAULT true,
    "downloads"   INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdCreative_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdCreative_category_active_idx" ON "AdCreative"("category", "active");

ALTER TABLE "AdCreative" ADD CONSTRAINT "AdCreative_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
