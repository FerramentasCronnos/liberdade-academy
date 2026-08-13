-- Páginas do membro: presell (rotador de grupos de WhatsApp) e bio (link na bio).
-- A tabela anterior foi criada vazia nesta mesma sessão; recriamos com o modelo certo.

DROP TABLE IF EXISTS "LandingPage" CASCADE;

CREATE TABLE "LandingPage" (
    "id"                TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "kind"              TEXT NOT NULL DEFAULT 'presell',
    "slug"              TEXT NOT NULL,
    "template"          TEXT NOT NULL DEFAULT 'minimalista',
    "title"             TEXT NOT NULL,
    "subtitle"          TEXT,
    "avatar"            TEXT,
    "config"            JSONB,
    "rotationAuto"      BOOLEAN NOT NULL DEFAULT true,
    "defaultClickLimit" INTEGER,
    "published"         BOOLEAN NOT NULL DEFAULT false,
    "views"             INTEGER NOT NULL DEFAULT 0,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LandingPage_slug_key" ON "LandingPage"("slug");
CREATE INDEX "LandingPage_userId_kind_idx" ON "LandingPage"("userId", "kind");

CREATE TABLE "PageGroup" (
    "id"         TEXT NOT NULL,
    "pageId"     TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "inviteUrl"  TEXT NOT NULL,
    "clickLimit" INTEGER,
    "clicks"     INTEGER NOT NULL DEFAULT 0,
    "active"     BOOLEAN NOT NULL DEFAULT true,
    "order"      INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageGroup_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PageGroup_pageId_order_idx" ON "PageGroup"("pageId", "order");

CREATE TABLE "PageClick" (
    "id"          TEXT NOT NULL,
    "pageId"      TEXT NOT NULL,
    "groupId"     TEXT,
    "utmSource"   TEXT,
    "utmMedium"   TEXT,
    "utmCampaign" TEXT,
    "utmContent"  TEXT,
    "utmTerm"     TEXT,
    "referrer"    TEXT,
    "device"      TEXT,
    "country"     TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageClick_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PageClick_pageId_createdAt_idx" ON "PageClick"("pageId", "createdAt");

ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageGroup" ADD CONSTRAINT "PageGroup_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageClick" ADD CONSTRAINT "PageClick_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageClick" ADD CONSTRAINT "PageClick_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PageGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
