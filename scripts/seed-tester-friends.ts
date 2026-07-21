/**
 * Non-destructive mutual friendships among soft-launch testers (tester01–tester20).
 * Does not touch non-tester accounts. Idempotent upserts.
 *
 * Usage:
 *   npx tsx scripts/seed-tester-friends.ts
 *   npx tsx scripts/seed-tester-friends.ts --prod
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { spawnSync } from "child_process";
import { config as loadEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const TESTER_COUNT = 20;

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

function redactUrl(url: string): string {
  return url.replace(/:[^:@/]+@/, ":***@");
}

type PrismaLike = {
  user: {
    findMany: (args: unknown) => Promise<{ id: string; handle: string }[]>;
  };
  friendship: {
    upsert: (args: unknown) => Promise<unknown>;
    count: (args?: unknown) => Promise<number>;
  };
  $disconnect: () => Promise<void>;
};

async function withPostgresClient<T>(fn: (prisma: PrismaLike) => Promise<T>): Promise<T> {
  const isPostgres = databaseUrl.startsWith("postgres");
  if (!isPostgres) {
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
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      console.warn(`Could not remove ${tmpDir} (safe to delete later).`);
    }
    spawnSync("npx", ["prisma", "generate"], {
      cwd: root,
      stdio: "inherit",
      shell: true,
    });
  }
}

async function main() {
  console.log(
    `Seeding mutual tester friendships → ${redactUrl(databaseUrl)}`
  );

  const handles = Array.from({ length: TESTER_COUNT }, (_, i) => {
    const num = String(i + 1).padStart(2, "0");
    return `tester${num}`;
  });

  await withPostgresClient(async (prisma) => {
    const testers = await prisma.user.findMany({
      where: { handle: { in: handles } },
      select: { id: true, handle: true },
      orderBy: { handle: "asc" },
    });

    if (testers.length < 2) {
      console.error(
        `Found ${testers.length} tester users. Run seed-testers first.`
      );
      process.exit(1);
    }

    console.log(`Found ${testers.length} testers. Linking mutual friends…`);
    let upserts = 0;
    for (let i = 0; i < testers.length; i++) {
      for (let j = 0; j < testers.length; j++) {
        if (i === j) continue;
        const userId = testers[i].id;
        const friendId = testers[j].id;
        await prisma.friendship.upsert({
          where: {
            userId_friendId: { userId, friendId },
          },
          create: { userId, friendId },
          update: {},
        });
        upserts += 1;
      }
    }

    const sample = testers[0];
    const sampleFriends = await prisma.friendship.count({
      where: { userId: sample.id },
    });
    console.log(
      `Upserted ${upserts} directed edges. @${sample.handle} now has ${sampleFriends} friend rows.`
    );
    console.log(
      "Regular (non-tester) users are unchanged — they still send/accept requests."
    );
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
