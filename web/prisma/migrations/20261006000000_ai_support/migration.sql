-- Assistentes de IA: base de conhecimento com busca em espanhol e histórico de chats.

CREATE TABLE "KnowledgeDoc" (
  "id"        TEXT NOT NULL,
  "assistant" TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "filename"  TEXT,
  "chars"     INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeDoc_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "KnowledgeDoc_assistant_createdAt_idx" ON "KnowledgeDoc"("assistant", "createdAt");

CREATE TABLE "KnowledgeChunk" (
  "id"        TEXT NOT NULL,
  "docId"     TEXT NOT NULL,
  "assistant" TEXT NOT NULL,
  "position"  INTEGER NOT NULL,
  "content"   TEXT NOT NULL,
  "search"    tsvector GENERATED ALWAYS AS (to_tsvector('spanish', "content")) STORED,
  CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeChunk_docId_fkey" FOREIGN KEY ("docId") REFERENCES "KnowledgeDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "KnowledgeChunk_assistant_idx" ON "KnowledgeChunk"("assistant");
CREATE INDEX "KnowledgeChunk_search_idx" ON "KnowledgeChunk" USING GIN ("search");

CREATE TABLE "SupportChat" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "assistant" TEXT NOT NULL,
  "escalated" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportChat_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SupportChat_userId_updatedAt_idx" ON "SupportChat"("userId", "updatedAt");

CREATE TABLE "SupportMessage" (
  "id"        TEXT NOT NULL,
  "chatId"    TEXT NOT NULL,
  "role"      TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "SupportChat"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SupportMessage_chatId_createdAt_idx" ON "SupportMessage"("chatId", "createdAt");
