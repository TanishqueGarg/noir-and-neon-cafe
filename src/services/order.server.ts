import { randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { requireDatabaseUrl } from "@/lib/env";
import { priceOrder, pickupDate } from "@/domain/order";
import { assertMatchingRequest, requestDigest } from "@/domain/idempotency";
import { withTransactionRetry } from "@/lib/prisma-errors";
import type { OrderRequest } from "@/lib/validation";
import type { OrderReceipt } from "@/types";
import { ADMIN_EMAIL_RECIPIENT, enqueueEmail, processEntityEmails } from "@/services/email-outbox.server";

const reference = () => `NN-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${randomBytes(3).toString("hex").toUpperCase()}`;
const receipt = (order: { id: string; reference: string; status: string; total: number; pickupTime: Date; emailStatus: string }): OrderReceipt => ({ id: order.id, reference: order.reference, status: order.status as OrderReceipt["status"], total: order.total, pickupTime: order.pickupTime.toISOString(), fulfillment: "PICKUP", paymentMethod: "PAY_AT_COUNTER", emailAccepted: ["ACCEPTED", "DELIVERED", "SENT", "PARTIAL"].includes(order.emailStatus) });

export async function createOrder(input: OrderRequest, database: PrismaClient = db): Promise<OrderReceipt> {
  requireDatabaseUrl();
  const requestHash = requestDigest(input);
  const order = await withTransactionRetry(() => database.$transaction(async (transaction) => {
    const existing = await transaction.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      assertMatchingRequest(existing.requestHash, input);
      return existing;
    }
    const settings = await transaction.businessSetting.findUnique({ where: { id: "primary" } });
    if (settings && !settings.pickupEnabled) throw new Error("PICKUP_DISABLED");
    const catalog = await transaction.menuItem.findMany({ where: { id: { in: input.items.map((item) => item.menuItemId) } }, select: { id: true, name: true, price: true, active: true, available: true } });
    const priced = priceOrder(input.items, catalog);
    const customer = await transaction.customer.create({ data: { name: input.customerName, email: input.email, mobile: input.mobile } });
    const created = await transaction.order.create({ data: {
      reference: reference(), idempotencyKey: input.idempotencyKey, requestHash, customerId: customer.id,
      fulfillment: "PICKUP", paymentMethod: "PAY_AT_COUNTER",
      pickupTime: pickupDate(input.pickupTime, settings?.pickupLeadMinutes || 25), notes: input.notes || null,
      subtotal: priced.subtotal, total: priced.subtotal,
      items: { create: priced.rows.map((row) => ({ menuItemId: row.menuItemId, name: row.name, quantity: row.quantity, unitPrice: row.unitPrice })) },
    } });
    const payload = { customerName: input.customerName, reference: created.reference, total: created.total, pickupTime: created.pickupTime.toISOString(), items: priced.rows.map((row) => ({ name: row.name, quantity: row.quantity, unitPrice: row.unitPrice })) };
    await enqueueEmail(transaction, { entityType: "ORDER", entityId: created.id, kind: "ORDER_CUSTOMER", recipient: input.email, payload });
    await enqueueEmail(transaction, { entityType: "ORDER", entityId: created.id, kind: "ORDER_STAFF", recipient: ADMIN_EMAIL_RECIPIENT, payload });
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));

  try { await processEntityEmails("ORDER", order.id, database); } catch { /* Persistence succeeded; the durable outbox will retry independently. */ }
  return receipt(await database.order.findUniqueOrThrow({ where: { id: order.id } }));
}
