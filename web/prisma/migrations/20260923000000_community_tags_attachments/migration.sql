-- Tags nos posts, anexos nas mensagens de ticket e os espaços pedidos:
-- Soporte general, Tráfico e Resultados (além de Preséntate e Anuncios).

ALTER TABLE "Post" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "TicketMessage" ADD COLUMN "attachments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

INSERT INTO "Space" ("id", "slug", "name", "description", "emoji", "kind", "order") VALUES
  ('space_soporte', 'soporte-general', 'Soporte general', 'Dudas sobre la plataforma, las herramientas y cómo empezar. La comunidad y el equipo responden.', '🛟', 'posts', 3),
  ('space_trafico', 'trafico',         'Tráfico',         'Videos, ganchos, anuncios y todo lo que trae gente a tu enlace.',                                  '🚀', 'posts', 4)
ON CONFLICT ("slug") DO NOTHING;

UPDATE "Space" SET "order" = 5, "description" = 'Ventas, comisiones y aprendizajes. Celebrar también es parte.' WHERE "slug" = 'resultados';

-- A categoria antiga vira tag, para não perder o contexto.
UPDATE "Post" SET "tags" = CASE "category"
  WHEN 'dica'      THEN ARRAY['consejo']
  WHEN 'resultado' THEN ARRAY['resultado']
  WHEN 'duvida'    THEN ARRAY['duda']
  WHEN 'motivacao' THEN ARRAY['motivación']
  ELSE ARRAY[]::TEXT[] END
WHERE cardinality("tags") = 0;

-- Posts dos espaços que saem migram para o equivalente.
UPDATE "Post" SET "spaceId" = 'space_trafico'    WHERE "spaceId" = 'space_consejos';
UPDATE "Post" SET "spaceId" = 'space_soporte'    WHERE "spaceId" = 'space_dudas';
UPDATE "Post" SET "spaceId" = 'space_resultados' WHERE "spaceId" = 'space_motivacion';

DELETE FROM "Space" WHERE "slug" IN ('consejos', 'dudas', 'motivacion');
