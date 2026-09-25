-- Threads de atendimento no chat de suporte e categoria nos tickets.
ALTER TABLE "Post"   ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'otro';
