import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "fs";
import { spawnSync } from "child_process";
import { config as loadEnv } from "dotenv";
import { compare } from "bcryptjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: resolve(root, ".env.production"), override: true });
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.startsWith("postgres")) {
  console.error("Need Postgres DATABASE_URL in .env.production");
  process.exit(1);
}

const tmpDir = resolve(root, "prisma/.pg-tmp-check");
const tmpSchema = resolve(tmpDir, "schema.prisma");
const clientOut = resolve(tmpDir, "client");
mkdirSync(tmpDir, { recursive: true });
writeFileSync(
  tmpSchema,
  readFileSync(resolve(root, "prisma/schema.prisma"), "utf8")
    .replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"')
    .replace(
      /generator\s+client\s*\{[^}]*\}/s,
      `generator client {\n  provider = "prisma-client-js"\n  output   = "${clientOut.replace(/\\/g, "/")}"\n}`
    )
);
spawnSync("npx", ["prisma", "generate", "--schema", tmpSchema], {
  cwd: root,
  env: { ...process.env, DATABASE_URL: databaseUrl },
  shell: true,
  stdio: "inherit",
});

const { PrismaClient } = await import(pathToFileURL(resolve(clientOut, "index.js")).href);
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const email = "tester01@watchify.app";
const password = "WatchifyT01!12a132";
const u = await prisma.user.findUnique({ where: { email } });
console.log({
  found: Boolean(u),
  id: u?.id,
  plan: u?.plan,
  verified: Boolean(u?.emailVerifiedAt),
  hasHash: Boolean(u?.passwordHash),
  banned: Boolean(u?.bannedAt),
});
const passwordMatches = u?.passwordHash
  ? await compare(password, u.passwordHash)
  : false;
console.log({ passwordMatches });
await prisma.$disconnect();
try {
  rmSync(tmpDir, { recursive: true, force: true });
} catch {
  /* ignore */
}
