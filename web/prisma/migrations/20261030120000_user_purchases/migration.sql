-- Produtos comprados por membro (nível: principal, Franquia, Golden Ticket).
ALTER TABLE "User" ADD COLUMN "purchases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
