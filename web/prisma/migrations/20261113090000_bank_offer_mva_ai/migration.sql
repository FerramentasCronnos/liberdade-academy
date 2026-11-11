-- Bank Offer nova, liberada para todos: MVA AI (app Brain), assinatura pela Stripe,
-- 30% de comissão recorrente pelo Rewardful. Planos de US$ 19 a US$ 249 por mês.
INSERT INTO "Product" ("id","externalId","provider","marketplace","region","currency","productUrl","name","image","images","price","priceMax","category","supplier","rating","salesCount","isViral","commission","resources","description","supplierShips","active","syncedAt","createdAt","updatedAt")
SELECT 'bankoffer_mva_ai','mva-ai','bank_offers','bank_offers','US','USD','https://s4.brainexperts.com.br/login',
  'MVA AI — Brain, tu estudio de IA para crear y vender',
  'https://catalogo.s4accelerator.com/bank-offers/mva-ai.png',
  ARRAY['https://catalogo.s4accelerator.com/bank-offers/mva-ai.png']::TEXT[],
  19,249,'digital','Bank Offers · MVA',0,0,false,30,
  '[{"kind": "affiliate", "label": "Afíliate en Rewardful", "url": "https://brain-experts.getrewardful.com/signup"}]'::JSONB,
  'MVA AI (Brain) es la plataforma de inteligencia artificial para crear y vender: cortes de video, imágenes, videos, voz, avatares y agentes de IA en un solo lugar. Suscripción mensual de US$ 19 a US$ 249. Oferta propia de MVA: gana 30% de comisión recurrente mientras tu cliente siga pagando.',
  false,true,NOW(),NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Product" WHERE "provider"='bank_offers' AND "externalId"='mva-ai');
