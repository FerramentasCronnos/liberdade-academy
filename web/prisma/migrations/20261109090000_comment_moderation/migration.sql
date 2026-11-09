-- Moderação de comentários (mesmos campos de Post). Colunas anuláveis: os
-- comentários existentes continuam publicados (reviewStatus NULL).
ALTER TABLE "Comment"
  ADD COLUMN "reviewStatus" TEXT,
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3);
CREATE INDEX "Comment_reviewStatus_createdAt_idx" ON "Comment"("reviewStatus", "createdAt");
