/**
 * Non-destructive upsert of soft-launch tester accounts with Party plan (no Stripe).
 *
 * Usage:
 *   npx tsx scripts/seed-testers.ts              # uses DATABASE_URL from env
 *   npx tsx scripts/seed-testers.ts --prod       # loads .env.production
 *
 * Writes logins to testers-credentials.txt (gitignored). Does NOT wipe other users.
 */
import { createHash } from "crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { spawnSync } from "child_process";
import { config as loadEnv } from "dotenv";
import { hash } from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const TESTER_COUNT = 20;
const PLAN = "party";
const CREDS_PATH = resolve(root, "testers-credentials.txt");

const useProd = process.argv.includes("--prod");
if (useProd) {
  loadEnv({ path: resolve(root, ".env.production"), override: true });
} else {
  loadEnv({ path: resolve(root, ".env") });
}

const databaseUrl = process.env.DATABASE_URL || "";
if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
if (databaseUrl.startsWith("file:") && useProd) {
  console.error("--prod requires a Postgres DATABASE_URL in .env.production");
  process.exit(1);
}

function makePassword(n: number): string {
  // Memorable + unique per seat; 12+ chars with symbol
  const salt = createHash("sha256")
    .update(`watchify-tester-${n}-v1`)
    .digest("hex")
    .slice(0, 6);
  return `WatchifyT${String(n).padStart(2, "0")}!${salt}`;
}

function redactUrl(url: string): string {
  return url.replace(/:[^:@/]+@/, ":***@");
}

async function withPostgresClient<T>(
  fn: (prisma: {
    user: {
      upsert: (args: unknown) => Promise<unknown>;
      findMany: (args: unknown) => Promise<
        { email: string; handle: string; plan: string; id: string }[]
      >;
    };
    $disconnect: () => Promise<void>;
  }) => Promise<T>
): Promise<T> {
  const isPostgres = databaseUrl.startsWith("postgres");
  if (!isPostgres) {
    // Local SQLite — use default generated client
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    try {
      return await fn(prisma as never);
    } finally {
      await prisma.$disconnect();
    }
  }

  const srcSchema = resolve(root, "prisma/schema.prisma");
  const tmpDir = resolve(root, "prisma/.pg-tmp-testers");
  const tmpSchema = resolve(tmpDir, "schema.prisma");
  const clientOut = resolve(tmpDir, "client");

  let schema = readFileSync(srcSchema, "utf8").replace(
    /provider\s*=\s*"sqlite"/,
    'provider = "postgresql"'
  );
  schema = schema.replace(
    /generator client \{[\s\S]*?\}/,
    `generator client {
  provider = "prisma-client-js"
  output   = "./client"
}`
  );

  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(tmpSchema, schema, "utf8");

  const gen = spawnSync(
    "npx",
    ["prisma", "generate", "--schema", tmpSchema],
    {
      cwd: root,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
      shell: true,
    }
  );
  if (gen.status !== 0) {
    rmSync(tmpDir, { recursive: true, force: true });
    throw new Error("prisma generate (postgres) failed");
  }

  const clientEntry = pathToFileURL(resolve(clientOut, "index.js")).href;
  const { PrismaClient } = await import(clientEntry);
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    return await fn(prisma as never);
  } finally {
    await prisma.$disconnect().catch(() => undefined);
    // Windows often locks the generated engine briefly — best-effort cleanup
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      console.warn(`Could not remove ${tmpDir} (safe to delete later).`);
    }
    // Restore local sqlite client for day-to-day dev
    spawnSync("npx", ["prisma", "generate"], {
      cwd: root,
      stdio: "inherit",
      shell: true,
    });
  }
}

async function main() {
  console.log(
    `Seeding ${TESTER_COUNT} Party-plan testers → ${redactUrl(databaseUrl)}`
  );

  const now = new Date();
  const rows: {
    n: number;
    id: string;
    email: string;
    handle: string;
    name: string;
    password: string;
  }[] = [];

  for (let n = 1; n <= TESTER_COUNT; n++) {
    const num = String(n).padStart(2, "0");
    rows.push({
      n,
      id: `tester_${num}`,
      email: `tester${num}@watchify.app`,
      handle: `tester${num}`,
      name: `Tester ${num}`,
      password: makePassword(n),
    });
  }

  await withPostgresClient(async (prisma) => {
    for (const r of rows) {
      const passwordHash = await hash(r.password, 10);
      await prisma.user.upsert({
        where: { email: r.email },
        create: {
          id: r.id,
          email: r.email,
          passwordHash,
          name: r.name,
          handle: r.handle,
          bio: "Soft-launch tester account — Party plan (comp).",
          avatarHue: 140 + ((r.n * 17) % 200),
          plan: PLAN,
          role: "user",
          emailVerifiedAt: now,
          ageVerified: true,
          publicWatching: true,
          recentlyWatchedIdsJson: "[]",
          linkedServicesJson: "[]",
          socialLinksJson: "{}",
        },
        update: {
          passwordHash,
          name: r.name,
          handle: r.handle,
          plan: PLAN,
          emailVerifiedAt: now,
          ageVerified: true,
          bannedAt: null,
        },
      });
      console.log(`  ✓ ${r.email} → plan=${PLAN}`);
    }

    const check = await prisma.user.findMany({
      where: { email: { startsWith: "tester" } },
      select: { email: true, handle: true, plan: true, id: true },
      orderBy: { email: "asc" },
    });
    console.log(`Verified ${check.length} tester* users in DB.`);
  });

  const site = useProd
    ? "https://watchify-web-9rx1.onrender.com"
    : "http://localhost:3344";

  const lines = [
    "Watchify soft-launch tester accounts",
    `Generated: ${now.toISOString()}`,
    `Site: ${site}/auth/signin`,
    `Plan: Party (host parties, Plus features) — no Stripe payment required`,
    "",
    "email\tpassword\thandle\tplan",
    ...rows.map(
      (r) => `${r.email}\t${r.password}\t${r.handle}\t${PLAN}`
    ),
    "",
    "Notes:",
    "- Accounts are pre-verified (emailVerifiedAt set).",
    "- Re-run this script to reset passwords / re-grant Party.",
    "- Do not commit this file.",
  ];

  writeFileSync(CREDS_PATH, lines.join("\n") + "\n", "utf8");
  console.log(`\nWrote logins → ${CREDS_PATH}`);
  console.log("\n--- Quick copy ---");
  for (const r of rows) {
    console.log(`${r.email}  /  ${r.password}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
