CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'READY', 'COMPLETED', 'CANCELLED');
CREATE TYPE "FulfillmentMethod" AS ENUM ('PICKUP');
CREATE TYPE "PaymentMethod" AS ENUM ('PAY_AT_COUNTER');
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED');
CREATE TYPE "InquiryStatus" AS ENUM ('OPEN', 'RESOLVED');
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'MANAGER');
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'PARTIAL', 'SKIPPED');

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "mobile" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MenuItem" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "longDescription" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "imageUrl" TEXT,
  "imagePosition" TEXT,
  "badge" TEXT,
  "dietary" JSONB NOT NULL,
  "ingredients" JSONB NOT NULL,
  "allergens" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "available" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MenuItem_price_check" CHECK ("price" > 0),
  CONSTRAINT "MenuItem_sortOrder_check" CHECK ("sortOrder" >= 0)
);

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "fulfillment" "FulfillmentMethod" NOT NULL DEFAULT 'PICKUP',
  "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'PAY_AT_COUNTER',
  "pickupTime" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "subtotal" INTEGER NOT NULL,
  "total" INTEGER NOT NULL,
  "emailStatus" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Order_subtotal_check" CHECK ("subtotal" >= 0),
  CONSTRAINT "Order_total_check" CHECK ("total" >= 0),
  CONSTRAINT "Order_total_matches_subtotal_check" CHECK ("total" = "subtotal")
);

CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "menuItemId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderItem_quantity_check" CHECK ("quantity" BETWEEN 1 AND 10),
  CONSTRAINT "OrderItem_unitPrice_check" CHECK ("unitPrice" > 0)
);

CREATE TABLE "Reservation" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "reservationTime" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 90,
  "guests" INTEGER NOT NULL,
  "requests" TEXT,
  "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
  "emailStatus" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Reservation_durationMinutes_check" CHECK ("durationMinutes" > 0),
  CONSTRAINT "Reservation_guests_check" CHECK ("guests" BETWEEN 1 AND 10)
);

CREATE TABLE "TableInventory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "seats" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TableInventory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TableInventory_seats_check" CHECK ("seats" > 0)
);

CREATE TABLE "ContactInquiry" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "InquiryStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContactInquiry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NewsletterSubscriber" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unsubscribedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminUser" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "AdminRole" NOT NULL DEFAULT 'MANAGER',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessSetting" (
  "id" TEXT NOT NULL DEFAULT 'primary',
  "displayName" TEXT NOT NULL DEFAULT 'NOIR & NEON',
  "address" TEXT,
  "phone" TEXT,
  "mapUrl" TEXT,
  "instagramUrl" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "openingHour" TEXT NOT NULL DEFAULT '08:00',
  "closingHour" TEXT NOT NULL DEFAULT '23:00',
  "kitchenClosingHour" TEXT NOT NULL DEFAULT '22:15',
  "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
  "pickupLeadMinutes" INTEGER NOT NULL DEFAULT 25,
  "reservationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "reservationDurationMinutes" INTEGER NOT NULL DEFAULT 90,
  "reservationSlotMinutes" INTEGER NOT NULL DEFAULT 30,
  "reservationCutoffMinutes" INTEGER NOT NULL DEFAULT 60,
  "maxGuestsPerReservation" INTEGER NOT NULL DEFAULT 10,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessSetting_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessSetting_pickupLeadMinutes_check" CHECK ("pickupLeadMinutes" >= 0),
  CONSTRAINT "BusinessSetting_reservationDurationMinutes_check" CHECK ("reservationDurationMinutes" > 0),
  CONSTRAINT "BusinessSetting_reservationSlotMinutes_check" CHECK ("reservationSlotMinutes" > 0),
  CONSTRAINT "BusinessSetting_reservationCutoffMinutes_check" CHECK ("reservationCutoffMinutes" >= 0),
  CONSTRAINT "BusinessSetting_maxGuestsPerReservation_check" CHECK ("maxGuestsPerReservation" BETWEEN 1 AND 10)
);

CREATE TABLE "EmailDelivery" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "providerId" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailDelivery_attempts_check" CHECK ("attempts" >= 0)
);

CREATE TABLE "SubmissionGuard" (
  "key" TEXT NOT NULL,
  "route" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubmissionGuard_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "SubmissionGuard_count_check" CHECK ("count" > 0)
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "adminId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Customer_email_idx" ON "Customer"("email");
CREATE INDEX "Customer_mobile_idx" ON "Customer"("mobile");
CREATE INDEX "Customer_email_mobile_idx" ON "Customer"("email", "mobile");
CREATE UNIQUE INDEX "MenuItem_slug_key" ON "MenuItem"("slug");
CREATE INDEX "MenuItem_category_active_available_idx" ON "MenuItem"("category", "active", "available");
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_pickupTime_idx" ON "Order"("pickupTime");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE UNIQUE INDEX "Reservation_reference_key" ON "Reservation"("reference");
CREATE UNIQUE INDEX "Reservation_idempotencyKey_key" ON "Reservation"("idempotencyKey");
CREATE INDEX "Reservation_reservationTime_status_idx" ON "Reservation"("reservationTime", "status");
CREATE INDEX "Reservation_status_createdAt_idx" ON "Reservation"("status", "createdAt");
CREATE UNIQUE INDEX "TableInventory_name_key" ON "TableInventory"("name");
CREATE INDEX "TableInventory_active_seats_idx" ON "TableInventory"("active", "seats");
CREATE INDEX "ContactInquiry_status_createdAt_idx" ON "ContactInquiry"("status", "createdAt");
CREATE INDEX "ContactInquiry_email_createdAt_idx" ON "ContactInquiry"("email", "createdAt");
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");
CREATE INDEX "NewsletterSubscriber_active_createdAt_idx" ON "NewsletterSubscriber"("active", "createdAt");
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
CREATE INDEX "EmailDelivery_status_updatedAt_idx" ON "EmailDelivery"("status", "updatedAt");
CREATE UNIQUE INDEX "EmailDelivery_entityType_entityId_kind_recipient_key" ON "EmailDelivery"("entityType", "entityId", "kind", "recipient");
CREATE INDEX "SubmissionGuard_route_windowStart_idx" ON "SubmissionGuard"("route", "windowStart");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
