-- Bank Offer nova em rascunho (active=false: só admin vê): Horosfy, app de astrologia do amor por assinatura (Stripe).
-- Primeiro mês US$ 9, depois US$ 29 por mês. Comissão de 55% a 80%: a faixa em dinheiro vai de 55% de US$ 9 (4,95)
-- a 80% de US$ 29 (23,20). Afiliação pelo Rewardful ainda a configurar (conta Stripe própria do Horosfy).
INSERT INTO "Product" ("id","externalId","provider","marketplace","region","currency","productUrl","name","image","images","price","priceMax","category","supplier","rating","salesCount","isViral","commission","commissionAmount","commissionAmountMax","resources","description","supplierShips","active","syncedAt","createdAt","updatedAt")
SELECT 'bankoffer_horosfy','horosfy','bank_offers','bank_offers','US','USD','https://quiz.horosfy.com',
  'Horosfy — Tu guía de astrología para el amor',
  'https://catalogo.s4accelerator.com/bank-offers/horosfy.png',
  ARRAY['https://catalogo.s4accelerator.com/bank-offers/horosfy.png']::TEXT[],
  9,29,'infoapp','Bank Offers · Horosfy',0,0,false,55,4.95,23.20,
  '[]'::JSONB,
  'Horosfy es una app de astrología para el amor: con un quiz rápido sobre la carta natal, revela el patrón amoroso, la compatibilidad real y lo que viene en los próximos meses. Suscripción: el primer mes cuesta US$ 9 y después US$ 29 al mes. Oferta propia: comisión recurrente desde 55% hasta 80% en cada mensualidad mientras tu cliente siga pagando.',
  false,false,NOW(),NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Product" WHERE "provider"='bank_offers' AND "externalId"='horosfy');
