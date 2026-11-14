-- Horosfy: logo nova (coração com a roda do zodíaco, fundo rosa).
UPDATE "Product"
SET "image" = 'https://catalogo.s4accelerator.com/bank-offers/horosfy-logo.jpg',
    "images" = ARRAY['https://catalogo.s4accelerator.com/bank-offers/horosfy-logo.jpg']::TEXT[],
    "updatedAt" = NOW()
WHERE "provider" = 'bank_offers' AND "externalId" = 'horosfy';
