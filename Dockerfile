# Watchify web (Next.js) — production image
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm install (not ci): Windows lockfiles can omit Linux optional deps and break npm ci.
RUN npm install

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Public URL defaults (Render also injects service env during docker build).
# Do not use empty ARG→ENV assignments — they wipe injected NEXT_PUBLIC_* values.
ENV NEXT_PUBLIC_APP_URL=https://watchify-web-9rx1.onrender.com
ENV NEXT_PUBLIC_REALTIME_URL=https://watchify-realtime.onrender.com
# Publishable key is public; bake so client checkout UI works even if build-args are empty.
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51TuqGUH14A0jEoKl6uXIGJ4tSK4zSFmGKTPVAnfTU1hDYdr5tXkoV0ypzhWKMdSs4VmWJpeihf18qWsqQO6G7XKX004gUoe7Kv
# Keep SQLite for local development, but generate a Postgres client in the image.
RUN sed 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma > prisma/schema.postgresql.prisma \
    && npx prisma generate --schema prisma/schema.postgresql.prisma \
    && npx next build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3344
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system watchify \
    && useradd --system --gid watchify watchify
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.mjs ./
USER watchify
EXPOSE 3344
CMD ["sh", "-c", "npx prisma db push --schema prisma/schema.postgresql.prisma --skip-generate && npm run start"]
