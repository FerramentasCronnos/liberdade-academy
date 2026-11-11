-- Criativos (pasta do Drive) do Ayuno Plan e do Tamefy (slug 101-patas).
-- Troca a pasta de criativos anterior, se houver, e mantém os demais recursos (ex.: afiliação Hotmart).
UPDATE "Product" SET
  "resources" = COALESCE(
      (SELECT jsonb_agg(e) FROM jsonb_array_elements(COALESCE("resources", '[]'::jsonb)) AS e WHERE e->>'kind' IS DISTINCT FROM 'creatives'),
      '[]'::jsonb
    ) || jsonb_build_array(jsonb_build_object(
      'kind', 'creatives',
      'label', 'Creativos (carpeta de Drive)',
      'url', CASE "externalId"
        WHEN 'ayuno-plan' THEN 'https://drive.google.com/drive/folders/1pbGi23-IG3-KyS-XFwr-qU3Q4JuyYrXv'
        WHEN '101-patas' THEN 'https://drive.google.com/drive/folders/11dsqRdX39NYbtdQVlgTsNgtKsmAAmKoG'
      END
    )),
  "updatedAt" = NOW()
WHERE "marketplace" = 'bank_offers' AND "externalId" IN ('101-patas', 'ayuno-plan');
