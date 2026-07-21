-- Short-lived key/value for TV pair codes and soft-launch helpers.
CREATE TABLE IF NOT EXISTS "SoftKv" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "valueJson" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
