-- Faixa de comissão fixa e preços reais (menor pack → maior pack) lidos nas páginas de venda.
ALTER TABLE "Product" ADD COLUMN "commissionAmountMax" DOUBLE PRECISION;

-- Suplementos: comissão estimada US$ 150–220 por venda
UPDATE "Product" SET "commissionAmount" = 150, "commissionAmountMax" = 220
WHERE "provider" = 'bank_offers' AND "externalId" IN ('sodamelt','burntide','presspril','memomatrix','sodapeak','memohoney','sodatide','bloodpril','sugarreset');

-- Preços por pack (1 ou 2 frascos → 6 frascos)
UPDATE "Product" SET "price" = 89,  "priceMax" = 294 WHERE "provider" = 'bank_offers' AND "externalId" IN ('sodamelt','burntide');
UPDATE "Product" SET "price" = 158, "priceMax" = 294 WHERE "provider" = 'bank_offers' AND "externalId" IN ('presspril','memomatrix','sodapeak','memohoney','sodatide','bloodpril','sugarreset');
