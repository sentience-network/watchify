# Watchify web (Next.js) — production image
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_REALTIME_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_REALTIME_URL=$NEXT_PUBLIC_REALTIME_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# Keep SQLite for local development, but generate a Postgres client in the image.
RUN sed 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma > prisma/schema.postgresql.prisma \
    && npx prisma generate --schema prisma/schema.postgresql.prisma \
    && npx next build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3344
RUN addgroup -S watchify && adduser -S watchify -G watchify
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.mjs ./
USER watchify
EXPOSE 3344
CMD ["sh", "-c", "npx prisma db push --schema prisma/schema.postgresql.prisma --skip-generate && npm run start"]
