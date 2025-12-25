-- Add tenant-level order notification sound configuration

-- 1) Enum for built-in + custom presets
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderNotificationSoundPreset') THEN
    CREATE TYPE "OrderNotificationSoundPreset" AS ENUM (
      'BELL',
      'CHIME',
      'BEEP',
      'DOUBLE_BEEP',
      'ALARM',
      'CUSTOM'
    );
  END IF;
END $$;

-- 2) Columns on Tenant
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "orderNotificationSoundPreset" "OrderNotificationSoundPreset" NOT NULL DEFAULT 'BELL',
  ADD COLUMN IF NOT EXISTS "orderNotificationSoundMime" TEXT,
  ADD COLUMN IF NOT EXISTS "orderNotificationSoundData" BYTEA;
