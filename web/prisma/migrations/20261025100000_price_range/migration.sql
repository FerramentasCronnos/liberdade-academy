-- Faixa de preço (piso em price, teto em priceMax); Bank Offers de US$ 80 a US$ 289.
ALTER TABLE "Product" ADD COLUMN "priceMax" DOUBLE PRECISION;
UPDATE "Product" SET "price" = 80, "priceMax" = 289 WHERE "provider" = 'bank_offers';
