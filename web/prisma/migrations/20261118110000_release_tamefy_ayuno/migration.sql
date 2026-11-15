-- Libera para todos os membros Tamefy (slug 101-patas) e Ayuno Plan (estavam só para admin).
UPDATE "Product" SET "active" = true, "updatedAt" = NOW()
WHERE "marketplace" = 'bank_offers'
  AND "externalId" IN ('101-patas', 'ayuno-plan');
