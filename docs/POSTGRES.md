# Watchify — switch SQLite → Postgres for launch

## Why
SQLite is fine for local soft-launch. Multi-instance production (web + realtime + scale) needs Postgres.

## Steps

1. **Backup** `prisma/dev.db` if you care about local data.
2. In `prisma/schema.prisma`, change:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Point `DATABASE_URL` at Postgres, e.g.:

```
DATABASE_URL="postgresql://watchify:PASSWORD@localhost:5432/watchify?schema=public"
```

4. Start DB:

```bash
docker compose -f docker-compose.launch.yml up -d db
# or full stack:
# docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

5. Migrate:

```bash
npx prisma migrate deploy
# first time creating migrations against Postgres after schema swap:
# npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
# then prisma migrate resolve / deploy as appropriate
```

6. **Do not seed** production (`WATCHIFY_SEED_DEMO_USERS=false`).

7. Verify:

```bash
npm run launch:check:prod
curl -s https://YOUR_HOST/api/health
curl -s https://YOUR_REALTIME_HOST/
```

## Rollback
Revert `provider` to `sqlite`, restore `DATABASE_URL="file:./dev.db"`, restart.
