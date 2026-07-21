-- Profile cosmetics: banners, frames, palettes, overlays, nameplates, badges.
-- Defaults preserve classic/soft/teal looks for existing users.
ALTER TABLE "User" ADD COLUMN "accentPalette" TEXT NOT NULL DEFAULT 'teal';
ALTER TABLE "User" ADD COLUMN "avatarStyle" TEXT NOT NULL DEFAULT 'hue';
ALTER TABLE "User" ADD COLUMN "avatarFrame" TEXT NOT NULL DEFAULT 'soft-ring';
ALTER TABLE "User" ADD COLUMN "bannerStyle" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "User" ADD COLUMN "patternOverlay" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "User" ADD COLUMN "nameplateStyle" TEXT NOT NULL DEFAULT 'classic';
ALTER TABLE "User" ADD COLUMN "profileBadgeIdsJson" TEXT NOT NULL DEFAULT '[]';
