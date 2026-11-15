import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { Prisma, type OrderStatus, type ReservationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { withTransactionRetry } from "@/lib/prisma-errors";
import type { z } from "zod";
import type { businessSettingsSchema, menuCreateSchema, menuUpdateSchema, tableCreateSchema, tableUpdateSchema } from "@/lib/validation";
import { recordAudit } from "@/services/audit.server";
import { enqueueEmail, processEntityEmails } from "@/services/email-outbox.server";
import { PUBLIC_BUSINESS_TAG, PUBLIC_MENU_TAG } from "@/services/public-data.server";

export const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["ACCEPTED", "REJECTED", "CANCELLED"], ACCEPTED: ["READY", "REJECTED", "CANCELLED"], READY: ["COMPLETED", "CANCELLED"], REJECTED: [], COMPLETED: [], CANCELLED: [],
};
export const reservationTransitions: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ["CONFIRMED", "REJECTED", "CANCELLED"], CONFIRMED: ["CANCELLED"], REJECTED: [], CANCELLED: [],
};
export const canTransitionOrder = (from: OrderStatus, to: OrderStatus) => orderTransitions[from].includes(to);
export const canTransitionReservation = (from: ReservationStatus, to: ReservationStatus) => reservationTransitions[from].includes(to);

const localDate = (value: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);

export async function updateOrderStatus(id: string, status: OrderStatus, adminId: string) {
  return withTransactionRetry(() => db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id } });
    if (!order) throw new Error("RECORD_NOT_FOUND");
    if (!canTransitionOrder(order.status, status)) throw new Error("INVALID_STATUS_TRANSITION");
    const updated = await tx.order.updateMany({ where: { id, status: order.status }, data: { status } });
    if (!updated.count) throw new Error("CONCURRENT_UPDATE");
    await recordAudit(tx, { adminId, action: "ORDER_STATUS_CHANGED", entityType: "ORDER", entityId: id, metadata: { from: order.status, to: status } });
    return tx.order.findUniqueOrThrow({ where: { id } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

export async function updateReservationStatus(id: string, status: ReservationStatus, adminId: string) {
  const reservation = await withTransactionRetry(() => db.$transaction(async (tx) => {
    const current = await tx.reservation.findUnique({ where: { id }, include: { customer: true } });
    if (!current) throw new Error("RECORD_NOT_FOUND");
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`reservation:${localDate(current.reservationTime)}`}))`;
    if (!canTransitionReservation(current.status, status)) throw new Error("INVALID_STATUS_TRANSITION");
    if (status === "CONFIRMED") {
      const capacity = (await tx.tableInventory.aggregate({ where: { active: true }, _sum: { seats: true } }))._sum.seats || 0;
      const start = current.reservationTime;
      const end = new Date(start.getTime() + current.durationMinutes * 60_000);
      const dayStart = new Date(start.getTime() - 24 * 60 * 60_000);
      const candidates = await tx.reservation.findMany({ where: { id: { not: id }, status: { in: ["PENDING", "CONFIRMED"] }, reservationTime: { gte: dayStart, lt: end } }, select: { reservationTime: true, durationMinutes: true, guests: true } });
      const occupied = candidates.filter((entry) => entry.reservationTime < end && new Date(entry.reservationTime.getTime() + entry.durationMinutes * 60_000) > start).reduce((sum, entry) => sum + entry.guests, 0);
      if (!capacity || occupied + current.guests > capacity) throw new Error("RESERVATION_CAPACITY_CONFLICT");
    }
    const changed = await tx.reservation.updateMany({ where: { id, status: current.status }, data: { status } });
    if (!changed.count) throw new Error("CONCURRENT_UPDATE");
    const kind = status === "CONFIRMED" ? "RESERVATION_CUSTOMER_CONFIRMED" : status === "REJECTED" ? "RESERVATION_CUSTOMER_REJECTED" : "RESERVATION_CUSTOMER_CANCELLED";
    await enqueueEmail(tx, { entityType: "RESERVATION", entityId: id, kind, recipient: current.customer.email, payload: { customerName: current.customer.name, reference: current.reference, reservationTime: current.reservationTime.toISOString(), guests: current.guests, status } });
    await recordAudit(tx, { adminId, action: "RESERVATION_STATUS_CHANGED", entityType: "RESERVATION", entityId: id, metadata: { from: current.status, to: status } });
    return tx.reservation.findUniqueOrThrow({ where: { id } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  try { await processEntityEmails("RESERVATION", id); } catch { /* Durable outbox retains the status notification. */ }
  return reservation;
}

type MenuCreate = z.output<typeof menuCreateSchema>;
type MenuUpdate = z.output<typeof menuUpdateSchema>;
export async function createMenuItem(input: MenuCreate, adminId: string) {
  const item = await db.$transaction(async (tx) => {
    const item = await tx.menuItem.create({ data: { id: randomUUID(), ...input, dietary: input.dietary, ingredients: input.ingredients, allergens: input.allergens } });
    await recordAudit(tx, { adminId, action: "MENU_ITEM_CREATED", entityType: "MENU_ITEM", entityId: item.id, metadata: { slug: item.slug } });
    return item;
  });
  revalidateTag(PUBLIC_MENU_TAG);
  return item;
}
export async function updateMenuItem(id: string, input: MenuUpdate, adminId: string) {
  const item = await db.$transaction(async (tx) => {
    const existing = await tx.menuItem.findUnique({ where: { id } });
    if (!existing) throw new Error("RECORD_NOT_FOUND");
    const item = await tx.menuItem.update({ where: { id }, data: input });
    await recordAudit(tx, { adminId, action: "MENU_ITEM_UPDATED", entityType: "MENU_ITEM", entityId: id, metadata: { fields: Object.keys(input) } });
    return item;
  });
  revalidateTag(PUBLIC_MENU_TAG);
  return item;
}

async function assertCapacity(transaction: Prisma.TransactionClient) {
  const capacity = (await transaction.tableInventory.aggregate({ where: { active: true }, _sum: { seats: true } }))._sum.seats || 0;
  const reservations = await transaction.reservation.findMany({ where: { status: { in: ["PENDING", "CONFIRMED"] }, reservationTime: { gte: new Date() } }, orderBy: { reservationTime: "asc" }, take: 1000, select: { reservationTime: true, durationMinutes: true, guests: true } });
  for (const point of reservations) {
    const occupied = reservations.filter((entry) => entry.reservationTime <= point.reservationTime && new Date(entry.reservationTime.getTime() + entry.durationMinutes * 60_000) > point.reservationTime).reduce((sum, entry) => sum + entry.guests, 0);
    if (occupied > capacity) throw new Error("CAPACITY_BELOW_BOOKINGS");
  }
}

type TableCreate = z.output<typeof tableCreateSchema>;
type TableUpdate = z.output<typeof tableUpdateSchema>;
export async function createTableInventory(input: TableCreate, adminId: string) {
  return db.$transaction(async (tx) => { const table = await tx.tableInventory.create({ data: input }); await recordAudit(tx, { adminId, action: "TABLE_CREATED", entityType: "TABLE", entityId: table.id, metadata: { seats: table.seats } }); return table; });
}
export async function updateTableInventory(id: string, input: TableUpdate, adminId: string) {
  return withTransactionRetry(() => db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('table-inventory'))`;
    const existing = await tx.tableInventory.findUnique({ where: { id } });
    if (!existing) throw new Error("RECORD_NOT_FOUND");
    const table = await tx.tableInventory.update({ where: { id }, data: input });
    await assertCapacity(tx);
    await recordAudit(tx, { adminId, action: "TABLE_UPDATED", entityType: "TABLE", entityId: id, metadata: { fields: Object.keys(input) } });
    return table;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

type BusinessInput = z.output<typeof businessSettingsSchema>;
export async function updateBusinessSettings(input: BusinessInput, adminId: string) {
  const settings = await db.$transaction(async (tx) => {
    const settings = await tx.businessSetting.upsert({ where: { id: "primary" }, create: { id: "primary", ...input }, update: input });
    await recordAudit(tx, { adminId, action: "BUSINESS_SETTINGS_UPDATED", entityType: "BUSINESS_SETTING", entityId: "primary", metadata: { fields: Object.keys(input) } });
    return settings;
  });
  revalidateTag(PUBLIC_BUSINESS_TAG);
  return settings;
}
