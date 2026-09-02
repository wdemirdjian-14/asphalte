# syntax=docker/dockerfile:1

# --- Dépendances ------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm ci s'exécute ici sous musl : il installe la variante Alpine de sharp
# (@img/sharp-linuxmusl-x64), présente dans le lock. Si la conversion venait
# malgré tout à échouer, lib/upload conserve le fichier d'origine plutôt que
# de perdre la pièce jointe.
RUN npm ci --no-audit --no-fund

# --- Build ------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Les variables NEXT_PUBLIC_* sont inlinées dans le bundle : elles doivent
# être connues au moment du build, pas seulement à l'exécution.
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
ARG NEXT_PUBLIC_SITE_URL="https://asphalte.walautao.fr"
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `npm run build` lance prisma generate puis next build (sortie standalone)
RUN npm run build

# --- Exécution --------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# CLI Prisma + tsx : migrations et seed au démarrage du conteneur
COPY package.json ./
RUN npm install --no-save --no-audit --no-fund prisma@6.19.2 tsx@4.20.3

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh \
  && mkdir -p ./public/uploads \
  && chown -R nextjs:nodejs ./public/uploads

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
