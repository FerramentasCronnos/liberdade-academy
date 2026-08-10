#!/bin/sh
set -e

echo "[api] waiting database..."
sleep 3

echo "[api] running migrations..."
npx prisma migrate deploy

echo "[api] seeding (idempotent-ish)..."
npx tsx prisma/seed.ts || true

echo "[api] starting..."
exec node dist/index.js
