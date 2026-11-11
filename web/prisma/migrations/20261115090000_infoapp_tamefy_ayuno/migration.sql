-- Tamefy (slug 101-patas) e Ayuno Plan também vão para a categoria InfoApp.
UPDATE "Product" SET "category"='infoapp', "updatedAt"=NOW()
WHERE "marketplace"='bank_offers' AND "externalId" IN ('101-patas','ayuno-plan');
