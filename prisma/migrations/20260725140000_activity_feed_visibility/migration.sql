-- Following / Discover activity feed: text posts + visibility + optional movieId
PRAGMA foreign_keys=OFF;

CREATE TABLE "Activity_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "movieId" TEXT,
    "watchlistId" TEXT,
    "partyId" TEXT,
    "serviceId" TEXT,
    "progressPercent" INTEGER,
    "text" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'friends',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "Activity_new" (
  "id", "userId", "type", "movieId", "watchlistId", "partyId",
  "serviceId", "progressPercent", "text", "visibility", "createdAt"
)
SELECT
  "id", "userId", "type", "movieId", "watchlistId", "partyId",
  "serviceId", "progressPercent", NULL, 'friends', "createdAt"
FROM "Activity";

DROP TABLE "Activity";
ALTER TABLE "Activity_new" RENAME TO "Activity";

CREATE INDEX "Activity_userId_createdAt_idx" ON "Activity"("userId", "createdAt");
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");
CREATE INDEX "Activity_visibility_createdAt_idx" ON "Activity"("visibility", "createdAt");

PRAGMA foreign_keys=ON;
