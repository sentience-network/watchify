-- Complimentary Party trial + lifetime free host credit for Free plan.
ALTER TABLE "User" ADD COLUMN "partyTrialEndsAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "freeHostsRemaining" INTEGER NOT NULL DEFAULT 1;
