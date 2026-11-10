-- Admin MVA: última entrada e uso por dia (mapa de calor).
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

CREATE TABLE "UserActivityDay" (
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "logins" INTEGER NOT NULL DEFAULT 0,
    "hits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserActivityDay_pkey" PRIMARY KEY ("userId","day")
);

ALTER TABLE "UserActivityDay" ADD CONSTRAINT "UserActivityDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- O que já existia: o último "visto" de cada pessoa vira uma marca de uso naquele dia.
INSERT INTO "UserActivityDay" ("userId", "day", "logins", "hits")
SELECT "id", to_char(("lastSeenAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD'), 0, 1
FROM "User" WHERE "lastSeenAt" IS NOT NULL
ON CONFLICT DO NOTHING;
