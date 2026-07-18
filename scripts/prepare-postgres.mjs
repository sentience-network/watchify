#!/usr/bin/env node
/**
 * Push current Prisma schema to the local Docker Postgres without changing
 * the SQLite-backed `prisma/schema.prisma` used by `npm run dev`.
 *
 * Usage: node scripts/prepare-postgres.mjs
 * Requires: docker compose -f docker-compose.launch.yml up -d db
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const srcSchema = resolve(root, "prisma/schema.prisma");
const tmpDir = resolve(root, "prisma/.pg-tmp");
const tmpSchema = resolve(tmpDir, "schema.prisma");
const pgUrl =
  process.env.POSTGRES_URL ||
  "postgresql://watchify:watchify@localhost:5432/watchify?schema=public";

const schema = readFileSync(srcSchema, "utf8").replace(
  /provider\s*=\s*"sqlite"/,
  'provider = "postgresql"'
);

mkdirSync(tmpDir, { recursive: true });
writeFileSync(tmpSchema, schema, "utf8");

console.log("Pushing schema →", pgUrl.replace(/:[^:@]+@/, ":***@"));
const result = spawnSync(
  "npx",
  ["prisma", "db", "push", "--schema", tmpSchema, "--skip-generate", "--accept-data-loss"],
  {
    cwd: root,
    env: { ...process.env, DATABASE_URL: pgUrl },
    stdio: "inherit",
    shell: true,
  }
);

rmSync(tmpDir, { recursive: true, force: true });

if (result.status !== 0) {
  console.error("Postgres prepare failed. Is Docker Postgres running?");
  process.exit(result.status || 1);
}

console.log("OK — Postgres schema ready. Keep local Next on SQLite until cutover.");
console.log("Cutover: set provider=postgresql in prisma/schema.prisma + DATABASE_URL to Postgres, then restart.");
