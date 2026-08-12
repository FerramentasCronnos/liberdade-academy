-- Gamificação: missões, recompensas e extrato de pontos.

ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Mission" (
    "id"            TEXT NOT NULL,
    "slug"          TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "description"   TEXT NOT NULL,
    "points"        INTEGER NOT NULL,
    "category"      TEXT NOT NULL DEFAULT 'outras',
    "kind"          TEXT NOT NULL DEFAULT 'proof',
    "repeatable"    BOOLEAN NOT NULL DEFAULT false,
    "cooldownHours" INTEGER,
    "active"        BOOLEAN NOT NULL DEFAULT true,
    "order"         INTEGER NOT NULL DEFAULT 0,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Mission_slug_key" ON "Mission"("slug");

CREATE TABLE "MissionCompletion" (
    "id"            TEXT NOT NULL,
    "missionId"     TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "status"        TEXT NOT NULL DEFAULT 'pending',
    "proofUrl"      TEXT,
    "note"          TEXT,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt"    TIMESTAMP(3),

    CONSTRAINT "MissionCompletion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MissionCompletion_userId_missionId_idx" ON "MissionCompletion"("userId", "missionId");
CREATE INDEX "MissionCompletion_status_idx" ON "MissionCompletion"("status");

CREATE TABLE "Reward" (
    "id"          TEXT NOT NULL,
    "slug"        TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "image"       TEXT,
    "costPoints"  INTEGER NOT NULL,
    "stock"       INTEGER,
    "active"      BOOLEAN NOT NULL DEFAULT true,
    "order"       INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Reward_slug_key" ON "Reward"("slug");

CREATE TABLE "Redemption" (
    "id"         TEXT NOT NULL,
    "rewardId"   TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "costPoints" INTEGER NOT NULL,
    "status"     TEXT NOT NULL DEFAULT 'requested',
    "note"       TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Redemption_userId_idx" ON "Redemption"("userId");
CREATE INDEX "Redemption_status_idx" ON "Redemption"("status");

CREATE TABLE "PointsEntry" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "points"    INTEGER NOT NULL,
    "reason"    TEXT NOT NULL,
    "refType"   TEXT,
    "refId"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PointsEntry_userId_createdAt_idx" ON "PointsEntry"("userId", "createdAt");

ALTER TABLE "MissionCompletion" ADD CONSTRAINT "MissionCompletion_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissionCompletion" ADD CONSTRAINT "MissionCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PointsEntry" ADD CONSTRAINT "PointsEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
