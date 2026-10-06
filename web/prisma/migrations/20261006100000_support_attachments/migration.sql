-- Prints e fotos nas conversas com o suporte.
ALTER TABLE "SupportMessage" ADD COLUMN "attachments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
