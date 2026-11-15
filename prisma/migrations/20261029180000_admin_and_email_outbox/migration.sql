ALTER TYPE "EmailDeliveryStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "EmailDeliveryStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "EmailDeliveryStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "EmailDeliveryStatus" ADD VALUE IF NOT EXISTS 'RETRYABLE';

ALTER TABLE "BusinessSetting" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "BusinessSetting" ADD COLUMN "facebookUrl" TEXT;

ALTER TABLE "EmailDelivery" ADD COLUMN "eventId" TEXT;
ALTER TABLE "EmailDelivery" ADD COLUMN "payload" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "EmailDelivery" ADD COLUMN "providerStatus" TEXT;
ALTER TABLE "EmailDelivery" ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "EmailDelivery" ADD COLUMN "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "EmailDelivery" ADD COLUMN "lastAttemptAt" TIMESTAMP(3);
ALTER TABLE "EmailDelivery" ADD COLUMN "lockedAt" TIMESTAMP(3);
ALTER TABLE "EmailDelivery" ADD COLUMN "acceptedAt" TIMESTAMP(3);
ALTER TABLE "EmailDelivery" ADD COLUMN "deliveredAt" TIMESTAMP(3);
UPDATE "EmailDelivery" SET "eventId" = "entityType" || ':' || "entityId" || ':' || "kind" || ':' || md5("recipient") WHERE "eventId" IS NULL;
UPDATE "EmailDelivery" SET "status" = 'SKIPPED', "lastError" = 'LEGACY_RECORD_NO_OUTBOX_PAYLOAD' WHERE "payload" = '{}' AND "status" = 'PENDING';
ALTER TABLE "EmailDelivery" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_maxAttempts_check" CHECK ("maxAttempts" BETWEEN 1 AND 10);
CREATE UNIQUE INDEX "EmailDelivery_eventId_key" ON "EmailDelivery"("eventId");
CREATE INDEX "EmailDelivery_status_nextAttemptAt_idx" ON "EmailDelivery"("status", "nextAttemptAt");

CREATE TABLE "AdminSession" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "csrfHash" TEXT NOT NULL,
  "userAgentHash" TEXT,
  "ipHash" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");
CREATE INDEX "AdminSession_adminId_expiresAt_idx" ON "AdminSession"("adminId", "expiresAt");
CREATE INDEX "AdminSession_expiresAt_revokedAt_idx" ON "AdminSession"("expiresAt", "revokedAt");
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
