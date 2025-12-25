-- Add billing fields for subscription payment tracking + grace period
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "subscriptionLastPaymentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "billingPastDueAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "billingGraceEndsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "billingRestrictedAt" TIMESTAMP(3);
