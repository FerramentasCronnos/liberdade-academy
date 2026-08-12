-- Perfil público do membro: bio e redes aparecem no Perfil da Comunidade.
-- "points" é o saldo de gamificação, separado do XP (que mede progressão).

ALTER TABLE "User"
  ADD COLUMN "bio"       TEXT,
  ADD COLUMN "instagram" TEXT,
  ADD COLUMN "tiktok"    TEXT,
  ADD COLUMN "points"    INTEGER NOT NULL DEFAULT 0;
