-- Comunidade em espaços (estilo Circle), comentários encadeados e tickets de suporte.
-- Só adiciona: nada do que existe é alterado ou removido.

CREATE TABLE "Space" (
  "id"          TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "emoji"       TEXT NOT NULL,
  "kind"        TEXT NOT NULL DEFAULT 'posts',
  "order"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Space_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Space_slug_key" ON "Space"("slug");

ALTER TABLE "Post"
  ADD COLUMN "title"   TEXT,
  ADD COLUMN "pinned"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "spaceId" TEXT;
ALTER TABLE "Post"
  ADD CONSTRAINT "Post_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Post_spaceId_pinned_createdAt_idx" ON "Post"("spaceId", "pinned", "createdAt");

ALTER TABLE "Comment" ADD COLUMN "parentId" TEXT;
ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");

ALTER TABLE "User" ADD COLUMN "introducedAt" TIMESTAMP(3);

CREATE TABLE "Ticket" (
  "id"            TEXT NOT NULL,
  "subject"       TEXT NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'abierto',
  "userId"        TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Ticket_userId_lastMessageAt_idx" ON "Ticket"("userId", "lastMessageAt");
CREATE INDEX "Ticket_status_lastMessageAt_idx" ON "Ticket"("status", "lastMessageAt");

CREATE TABLE "TicketMessage" (
  "id"          TEXT NOT NULL,
  "ticketId"    TEXT NOT NULL,
  "authorId"    TEXT NOT NULL,
  "content"     TEXT NOT NULL,
  "fromSupport" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TicketMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TicketMessage_ticketId_createdAt_idx" ON "TicketMessage"("ticketId", "createdAt");

-- Espaços iniciais. A migração cria para não depender de um passo de seed.
INSERT INTO "Space" ("id", "slug", "name", "description", "emoji", "kind", "order") VALUES
  ('space_presentaciones', 'presentaciones', 'Preséntate',      'Cuéntanos quién eres, de dónde eres y qué quieres lograr.',            '👋', 'intro',         1),
  ('space_anuncios',       'anuncios',       'Anuncios',        'Novedades de la plataforma y avisos del equipo.',                       '📣', 'announcements', 2),
  ('space_consejos',       'consejos',       'Consejos',        'Lo que te funcionó: videos, ganchos, productos, rutinas.',              '💡', 'posts',         3),
  ('space_resultados',     'resultados',     'Resultados',      'Comparte tus ventas y comisiones. Celebrar también es parte.',          '🏆', 'posts',         4),
  ('space_dudas',          'dudas',          'Dudas',           'Pregunta lo que sea. La comunidad y el equipo responden.',              '❓', 'posts',         5),
  ('space_motivacion',     'motivacion',     'Motivación',      'Historias, aprendizajes y el empujón que alguien necesita hoy.',        '🔥', 'posts',         6)
ON CONFLICT ("slug") DO NOTHING;

-- Publicações antigas entram no espaço equivalente à categoria.
UPDATE "Post" SET "spaceId" = CASE "category"
  WHEN 'dica'      THEN 'space_consejos'
  WHEN 'resultado' THEN 'space_resultados'
  WHEN 'duvida'    THEN 'space_dudas'
  WHEN 'motivacao' THEN 'space_motivacion'
  ELSE 'space_consejos' END
WHERE "spaceId" IS NULL;
