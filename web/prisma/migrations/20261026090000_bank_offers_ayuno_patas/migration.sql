-- Duas Bank Offers novas (só admin até liberar): Ayuno Plan e 101 Patas.
-- Ticket US$ 37–97, comissão 80%. Imagens servidas pelo próprio site.
INSERT INTO "Product" ("id","externalId","provider","marketplace","region","currency","productUrl","name","image","images","price","priceMax","category","supplier","rating","salesCount","isViral","commission","description","supplierShips","active","syncedAt","createdAt","updatedAt")
SELECT 'bankoffer_ayuno_plan','ayuno-plan','bank_offers','bank_offers','US','USD',NULL,
  'Ayuno Plan — Plan de ayuno intermitente personalizado',
  'https://catalogo.s4accelerator.com/bank-offers/ayuno-plan.jpg',
  ARRAY['https://catalogo.s4accelerator.com/bank-offers/ayuno-plan.jpg']::TEXT[],
  37,97,'saude','Bank Offers · MVA',0,0,false,80,
  'Ayuno Plan es un plan digital de ayuno intermitente personalizado para perder peso con horarios, menús y seguimiento. Oferta propia de MVA: promociona con tu enlace de afiliado.',
  false,false,NOW(),NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Product" WHERE "provider"='bank_offers' AND "externalId"='ayuno-plan');

INSERT INTO "Product" ("id","externalId","provider","marketplace","region","currency","productUrl","name","image","images","price","priceMax","category","supplier","rating","salesCount","isViral","commission","description","supplierShips","active","syncedAt","createdAt","updatedAt")
SELECT 'bankoffer_101_patas','101-patas','bank_offers','bank_offers','US','USD',NULL,
  '101 Patas — Adiestramiento canino en casa',
  'https://catalogo.s4accelerator.com/bank-offers/101-patas.jpg',
  ARRAY['https://catalogo.s4accelerator.com/bank-offers/101-patas.jpg']::TEXT[],
  37,97,'fisico','Bank Offers · MVA',0,0,false,80,
  '101 Patas es un programa digital de adiestramiento canino en casa, paso a paso, para educar a tu perro sin adiestrador. Oferta propia de MVA: promociona con tu enlace de afiliado.',
  false,false,NOW(),NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Product" WHERE "provider"='bank_offers' AND "externalId"='101-patas');
