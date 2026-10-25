-- Comissão fixa por venda (Bank Offers) e valor inicial de US$ 170 nas ofertas próprias.
ALTER TABLE "Product" ADD COLUMN "commissionAmount" DOUBLE PRECISION;
UPDATE "Product" SET "commissionAmount" = 170 WHERE "provider" = 'bank_offers';
