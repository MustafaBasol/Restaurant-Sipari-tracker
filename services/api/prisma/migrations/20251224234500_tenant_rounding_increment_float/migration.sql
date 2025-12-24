-- AlterTable
ALTER TABLE "Tenant"
ALTER COLUMN "roundingIncrement" TYPE DOUBLE PRECISION
USING CASE
  WHEN "roundingIncrement" IS NULL THEN NULL
  ELSE "roundingIncrement"::DOUBLE PRECISION
END;
