-- Comissão passa a ser opcional.
-- A maioria dos scrapers de TikTok Shop não devolve taxa de comissão, e o
-- default de 20% fazia o app exibir um número inventado como se fosse real.
-- NULL agora significa "não sabemos" e a UI simplesmente não mostra o campo.

ALTER TABLE "Product" ALTER COLUMN "commission" DROP NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "commission" DROP DEFAULT;

-- Produtos já sincronizados de provider externo tinham o 20% fabricado.
UPDATE "Product" SET "commission" = NULL WHERE provider <> 'seed';
