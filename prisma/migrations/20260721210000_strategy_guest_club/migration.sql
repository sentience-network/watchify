-- Soft-launch strategy: guest magic-link join + weekly watch club lineage
ALTER TABLE "User" ADD COLUMN "isGuest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Party" ADD COLUMN "clubParentId" TEXT;
ALTER TABLE "Party" ADD COLUMN "hostClubStreak" INTEGER NOT NULL DEFAULT 0;
