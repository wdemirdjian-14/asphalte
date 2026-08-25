#!/bin/sh
set -e

echo "→ Application des migrations Prisma…"
npx --yes prisma migrate deploy

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "→ Seed (compte administrateur)…"
  npx --yes tsx prisma/seed.ts
fi

echo "→ Démarrage d'Asphalte sur le port ${PORT:-3000}"
exec "$@"
