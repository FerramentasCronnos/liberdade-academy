-- 101 Patas passa a se chamar Tamefy (nome, descrição e imagem). O externalId fica igual.
UPDATE "Product" SET
  "name" = replace("name", '101 Patas', 'Tamefy'),
  "description" = replace("description", '101 Patas', 'Tamefy'),
  "image" = replace("image", '101-patas.jpg', 'tamefy.jpg'),
  "images" = ARRAY(SELECT replace(u, '101-patas.jpg', 'tamefy.jpg') FROM unnest("images") AS u),
  "updatedAt" = NOW()
WHERE "marketplace" = 'bank_offers' AND "externalId" = '101-patas';
