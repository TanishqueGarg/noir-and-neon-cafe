import { randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { availabilityForSlots, assertBookableDate, generateSlots, isValidLocalDate, localDateTimeToUtc } from "@/domain/reservation";
import { assertMatchingRequest, requestDigest } from "@/domain/idempotency";
import { db } from "@/lib/db";
import { requireDatabaseUrl } from "@/lib/env";
import { withTransactionRetry } from "@/lib/prisma-errors";
import type { ReservationRequest } from "@/lib/validation";
import type { AvailabilitySlot, ReservationReceipt } from "@/types";
import { ADMIN_EMAIL_RECIPIENT, enqueueEmail, processEntityEmails } from "@/services/email-outbox.server";

const reference = () => `RSV-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${randomBytes(3).toString("hex").toUpperCase()}`;
const dayRange = (date: string) => {
  const start = localDateTimeToUtc(date, "00:00");
  return { start, end: new Date(start.getTime() + 86_400_000) };
};

async function context(date: string, guests: number, client: Prisma.TransactionClient | typeof db = db) {
  const settings = await client.businessSetting.findUnique({ where: { id: "primary" } });
  if (!settings?.reservationEnabled) throw new Error("RESERVATIONS_DISABLED");
  if (guests > settings.maxGuestsPerReservation) throw new Error("GUEST_LIMIT");
  const capacityResult = await client.tableInventory.aggregate({ where: { active: true }, _sum: { seats: true } });
  const capacity = capacityResult._sum.seats || 0;
  if (!capacity) throw new Error("CAPACITY_NOT_CONFIGURED");
  const range = dayRange(date);
  const reservations = await client.reservation.findMany({ where: { reservationTime: { gte: range.start, lt: range.end }, status: { in: ["PENDING", "CONFIRMED"] } }, select: { reservationTime: true, durationMinutes: true, guests: true } });
  const slots = generateSlots(settings.openingHour, settings.closingHour, settings.reservationDurationMinutes, settings.reservationSlotMinutes);
  return { settings, capacity, reservations, slots };
}

export async function getAvailability(date: string, guests: number, now = new Date(), database: PrismaClient = db): Promise<AvailabilitySlot[]> {
  requireDatabaseUrl();
  assertBookableDate(date, "23:59", 0, now);
  const value = await context(date, guests, database);
  return availabilityForSlots({ date, guests, capacity: value.capacity, reservations: value.reservations, slots: value.slots, durationMinutes: value.settings.reservationDurationMinutes, cutoffMinutes: value.settings.reservationCutoffMinutes, now });
}

export async function createReservation(input: ReservationRequest, database: PrismaClient = db): Promise<ReservationReceipt> {
  requireDatabaseUrl();
  if (!isValidLocalDate(input.date)) throw new Error("INVALID_DATE");
  const digest = requestDigest(input);
  const reservation = await withTransactionRetry(() => database.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`reservation:${input.date}`}))`;
    const existing = await transaction.reservation.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      assertMatchingRequest(existing.requestHash, input);
      return existing;
    }
    const value = await context(input.date, input.guests, transaction);
    if (!value.slots.includes(input.time)) throw new Error("INVALID_TIME_SLOT");
    const reservationTime = assertBookableDate(input.date, input.time, value.settings.reservationCutoffMinutes);
    const availability = availabilityForSlots({ date: input.date, guests: input.guests, capacity: value.capacity, reservations: value.reservations, slots: [input.time], durationMinutes: value.settings.reservationDurationMinutes, cutoffMinutes: value.settings.reservationCutoffMinutes });
    if (availability[0]?.status === "unavailable") throw new Error("SLOT_UNAVAILABLE");
    const customer = await transaction.customer.create({ data: { name: input.name, email: input.email, mobile: input.mobile } });
    const created = await transaction.reservation.create({ data: { reference: reference(), idempotencyKey: input.idempotencyKey, requestHash: digest, customerId: customer.id, reservationTime, durationMinutes: value.settings.reservationDurationMinutes, guests: input.guests, requests: input.requests || null, status: "PENDING" } });
    const payload = { customerName: input.name, reference: created.reference, reservationTime: created.reservationTime.toISOString(), guests: created.guests, status: "PENDING" as const };
    await enqueueEmail(transaction, { entityType: "RESERVATION", entityId: created.id, kind: "RESERVATION_CUSTOMER_REQUESTED", recipient: input.email, payload });
    await enqueueEmail(transaction, { entityType: "RESERVATION", entityId: created.id, kind: "RESERVATION_STAFF", recipient: ADMIN_EMAIL_RECIPIENT, payload });
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));

  try { await processEntityEmails("RESERVATION", reservation.id, database); } catch { /* Persistence succeeded; the durable outbox will retry independently. */ }
  const current = await database.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(reservation.reservationTime);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return { id: current.id, reference: current.reference, status: current.status, date: `${pick("year")}-${pick("month")}-${pick("day")}`, time: `${pick("hour")}:${pick("minute")}`, emailAccepted: ["ACCEPTED", "DELIVERED", "SENT", "PARTIAL"].includes(current.emailStatus) };
}
