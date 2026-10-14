-- Assinatura Creators (Stripe) e moderação de posts.
ALTER TABLE "User"
  ADD COLUMN "creatorsAccess" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "creatorsAccessUntil" TIMESTAMP(3),
  ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Post"
  ADD COLUMN "reviewStatus" TEXT,
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3);
CREATE INDEX "Post_reviewStatus_createdAt_idx" ON "Post"("reviewStatus", "createdAt");
