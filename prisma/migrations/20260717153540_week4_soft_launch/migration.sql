-- CreateTable
CREATE TABLE "TraktConnection" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "accessTokenCiphertext" TEXT NOT NULL,
    "refreshTokenCiphertext" TEXT NOT NULL,
    "tokenExpiresAt" DATETIME,
    "scope" TEXT NOT NULL DEFAULT '',
    "lastSyncedAt" DATETIME,
    "lastSyncError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TraktConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportedMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "catalogId" TEXT,
    "watchedAt" DATETIME,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ImportedMedia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "sessionHash" TEXT,
    "propertiesJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Party" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "startsAt" DATETIME,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'open',
    "serviceId" TEXT,
    "syncMode" TEXT NOT NULL DEFAULT 'social',
    "coHostIdsJson" TEXT NOT NULL DEFAULT '[]',
    "recurringWeekly" BOOLEAN NOT NULL DEFAULT false,
    "inviteCode" TEXT NOT NULL,
    "inviteExpiresAt" DATETIME,
    "inviteRevokedAt" DATETIME,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "maxMembers" INTEGER NOT NULL DEFAULT 20,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Party_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Party" ("coHostIdsJson", "createdAt", "hostId", "id", "inviteCode", "isLive", "movieId", "name", "recurringWeekly", "serviceId", "startsAt", "status", "syncMode", "updatedAt") SELECT "coHostIdsJson", "createdAt", "hostId", "id", "inviteCode", "isLive", "movieId", "name", "recurringWeekly", "serviceId", "startsAt", "status", "syncMode", "updatedAt" FROM "Party";
DROP TABLE "Party";
ALTER TABLE "new_Party" RENAME TO "Party";
CREATE UNIQUE INDEX "Party_inviteCode_key" ON "Party"("inviteCode");
CREATE INDEX "Party_hostId_status_idx" ON "Party"("hostId", "status");
CREATE INDEX "Party_status_idx" ON "Party"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ImportedMedia_userId_source_watchedAt_idx" ON "ImportedMedia"("userId", "source", "watchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedMedia_userId_source_sourceId_watchedAt_key" ON "ImportedMedia"("userId", "source", "sourceId", "watchedAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON "AnalyticsEvent"("userId", "createdAt");
