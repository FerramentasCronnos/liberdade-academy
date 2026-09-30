-- Reenvio de e-mail de anúncio agendado.
ALTER TABLE "Post" ADD COLUMN "notifyAt" TIMESTAMP(3);
