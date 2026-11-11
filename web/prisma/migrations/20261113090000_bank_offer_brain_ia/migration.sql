-- Bank Offer nova, liberada para todos: Brain IA (app Brain), assinatura pela Stripe,
-- comissão recorrente pelo Rewardful (cadastro em brain-experts.getrewardful.com). Planos de US$ 19 a US$ 249 por mês.
INSERT INTO "Product" ("id","externalId","provider","marketplace","region","currency","productUrl","name","image","images","price","priceMax","category","supplier","rating","salesCount","isViral","commission","resources","description","supplierShips","active","syncedAt","createdAt","updatedAt")
SELECT 'bankoffer_brain_ia','brain-ia','bank_offers','bank_offers','US','USD','https://s4.brainexperts.com.br',
  'Brain IA — tu estudio de IA para crear y vender',
  'https://catalogo.s4accelerator.com/bank-offers/brain-ia.png',
  ARRAY['https://catalogo.s4accelerator.com/bank-offers/brain-ia.png']::TEXT[],
  19,249,'digital','Bank Offers · Brain IA',0,0,false,55,
  '[{"kind": "affiliate", "label": "Afíliate en Rewardful", "url": "https://brain-experts.getrewardful.com/signup"}]'::JSONB,
  'Brain IA es la plataforma de inteligencia artificial para crear y vender: cortes de video, imágenes, videos, voz, avatares y agentes de IA en un solo lugar. Suscripción mensual de US$ 19 a US$ 249. Oferta propia: gana 55% de comisión recurrente en cada mensualidad mientras tu cliente siga pagando.',
  false,true,NOW(),NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Product" WHERE "provider"='bank_offers' AND "externalId"='brain-ia');
