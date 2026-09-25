-- Espaço em modo chat (Soporte general) e anexos em posts e comentários.

ALTER TABLE "Post"    ADD COLUMN "attachments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Comment" ADD COLUMN "attachments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Space" SET "kind" = 'chat',
  "description" = 'Pregunta lo que necesites. La comunidad y el equipo responden en tiempo real.'
WHERE "slug" = 'soporte-general';

UPDATE "Space" SET "description" = 'Estás en el lugar correcto. Cuéntanos quién eres y qué quieres lograr.' WHERE "slug" = 'presentaciones';
UPDATE "Space" SET "description" = 'Novedades, mejoras y avisos del equipo. Todo lo importante pasa por aquí.' WHERE "slug" = 'anuncios';
UPDATE "Space" SET "description" = 'Videos, ganchos y anuncios: todo lo que trae gente a tu enlace.' WHERE "slug" = 'trafico';
