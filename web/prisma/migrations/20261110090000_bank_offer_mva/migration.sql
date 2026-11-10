-- Bank Offer nova, já liberada para todos: MVA (US$ 97, comissão 55%, afiliação na Hotmart).
INSERT INTO "Product" ("id","externalId","provider","marketplace","region","currency","productUrl","name","image","images","price","priceMax","category","supplier","rating","salesCount","isViral","commission","resources","description","supplierShips","active","syncedAt","createdAt","updatedAt")
SELECT 'bankoffer_mva','mva','bank_offers','bank_offers','US','USD',NULL,
  'MVA — Máquina de Ventas Automática',
  'https://catalogo.s4accelerator.com/bank-offers/mva.png',
  ARRAY['https://catalogo.s4accelerator.com/bank-offers/mva.png']::TEXT[],
  97,NULL,'digital','Bank Offers · MVA',0,0,false,55,
  '[{"kind": "creatives", "label": "Creativos (carpeta de Drive)", "url": "https://drive.google.com/drive/folders/1rAGpVWIMR56O_Myhfl-gZtrOgMpDlutX"}, {"kind": "affiliate", "label": "Afíliate en Hotmart", "url": "https://affiliate.hotmart.com/affiliate-recruiting/view/8289M107851877"}]'::JSONB,
  'MVA, la Máquina de Ventas Automática: el programa para crear contenido y vender en internet con inteligencia artificial. Oferta propia de MVA: promociona con tu enlace de afiliado y gana 55% de comisión.',
  false,true,NOW(),NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Product" WHERE "provider"='bank_offers' AND "externalId"='mva');
