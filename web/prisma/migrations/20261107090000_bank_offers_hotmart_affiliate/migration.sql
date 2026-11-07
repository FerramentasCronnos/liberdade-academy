-- Tamefy e Ayuno Plan: o pedido de afiliação vai direto para a página de recrutamento da Hotmart
-- (recurso kind 'affiliate'). Remove um 'affiliate' anterior, se houver, e mantém os demais recursos.
UPDATE "Product" SET
  "resources" = COALESCE(
      (SELECT jsonb_agg(e) FROM jsonb_array_elements(COALESCE("resources", '[]'::jsonb)) AS e WHERE e->>'kind' IS DISTINCT FROM 'affiliate'),
      '[]'::jsonb
    ) || jsonb_build_array(jsonb_build_object(
      'kind', 'affiliate',
      'label', 'Afíliate en Hotmart',
      'url', CASE "externalId"
        WHEN '101-patas' THEN 'https://affiliate.hotmart.com/affiliate-recruiting/view/3114T108099055'
        WHEN 'ayuno-plan' THEN 'https://affiliate.hotmart.com/affiliate-recruiting/view/3066A108098905'
      END
    )),
  "updatedAt" = NOW()
WHERE "marketplace" = 'bank_offers' AND "externalId" IN ('101-patas', 'ayuno-plan');
