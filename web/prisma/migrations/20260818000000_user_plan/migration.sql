-- Plano do membro. O anual de R$ 147 libera tudo; o de R$ 97 é o plano base.

ALTER TABLE "User"
  ADD COLUMN "plan"          TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN "planExpiresAt" TIMESTAMP(3),
  ADD COLUMN "planSource"    TEXT,
  ADD COLUMN "planUpdatedAt" TIMESTAMP(3);

CREATE INDEX "User_plan_idx" ON "User"("plan");
