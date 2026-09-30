-- Anúncios agendados e controle do e-mail de aviso.
ALTER TABLE "Post"
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "notifyEmail" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notifiedAt"  TIMESTAMP(3);
CREATE INDEX "Post_scheduledAt_notifiedAt_idx" ON "Post"("scheduledAt", "notifiedAt");
