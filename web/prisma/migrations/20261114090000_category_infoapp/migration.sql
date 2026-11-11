-- Categoria nova "InfoApp" (apps de assinatura): o Brain IA sai de Digital e vai para ela.
UPDATE "Product" SET "category"='infoapp', "updatedAt"=NOW()
WHERE "provider"='bank_offers' AND "externalId"='brain-ia';
