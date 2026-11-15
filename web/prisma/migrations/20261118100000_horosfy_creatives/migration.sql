-- Horosfy: pasta de criativos validados (subpastas Love Chart e Prosperidade), sem duplicar se já existir.
UPDATE "Product"
SET "resources" = COALESCE("resources", '[]'::JSONB)
      || '[{"kind": "creatives", "label": "Creativos (carpeta de Drive)", "url": "https://drive.google.com/drive/folders/18IhJgcEeaASYFqHca3wtE_reyzmOY_BO"}]'::JSONB,
    "updatedAt" = NOW()
WHERE "provider" = 'bank_offers' AND "externalId" = 'horosfy'
  AND NOT COALESCE("resources", '[]'::JSONB) @> '[{"kind": "creatives"}]'::JSONB;
