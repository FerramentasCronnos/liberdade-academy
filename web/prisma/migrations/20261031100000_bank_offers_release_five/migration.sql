-- Libera para todos os membros as 5 ofertas com criativos e presell prontos.
UPDATE "Product" SET "active" = true
WHERE "marketplace" = 'bank_offers'
  AND "externalId" IN ('sodapeak', 'memohoney', 'sodatide', 'bloodpril', 'sugarreset');
