-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reporterId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "reviewedAt" DATETIME,
    "reviewedById" TEXT,
    "actionNote" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Report" ("createdAt", "details", "id", "reason", "reporterId", "targetUserId") SELECT "createdAt", "details", "id", "reason", "reporterId", "targetUserId" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "avatarHue" INTEGER NOT NULL DEFAULT 168,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "emailVerifiedAt" DATETIME,
    "bannedAt" DATETIME,
    "warnedAt" DATETIME,
    "ageVerified" BOOLEAN NOT NULL DEFAULT false,
    "socialLinksJson" TEXT NOT NULL DEFAULT '{}',
    "linkedServicesJson" TEXT NOT NULL DEFAULT '[]',
    "publicWatching" BOOLEAN NOT NULL DEFAULT true,
    "currentlyWatchingId" TEXT,
    "currentlyWatchingServiceId" TEXT,
    "watchingProgressPercent" INTEGER,
    "recentlyWatchedIdsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("ageVerified", "avatarHue", "bio", "createdAt", "currentlyWatchingId", "currentlyWatchingServiceId", "email", "handle", "id", "linkedServicesJson", "name", "passwordHash", "plan", "publicWatching", "recentlyWatchedIdsJson", "socialLinksJson", "stripeCustomerId", "stripeSubscriptionId", "updatedAt", "watchingProgressPercent") SELECT "ageVerified", "avatarHue", "bio", "createdAt", "currentlyWatchingId", "currentlyWatchingServiceId", "email", "handle", "id", "linkedServicesJson", "name", "passwordHash", "plan", "publicWatching", "recentlyWatchedIdsJson", "socialLinksJson", "stripeCustomerId", "stripeSubscriptionId", "updatedAt", "watchingProgressPercent" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
