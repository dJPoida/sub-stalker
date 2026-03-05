CREATE TYPE "DisplayMode" AS ENUM ('DEVICE', 'LIGHT', 'DARK');

ALTER TABLE "UserSettings"
ADD COLUMN "displayMode" "DisplayMode" NOT NULL DEFAULT 'DEVICE';
