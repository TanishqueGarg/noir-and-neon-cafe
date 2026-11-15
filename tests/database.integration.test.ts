import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOrder } from "@/services/order.server";
import { createReservation } from "@/services/reservation.server";

const testUrl = process.env.TEST_DATABASE_URL;
const integrationEnabled = process.env.ALLOW_DATABASE_TESTS === "true" && Boolean(testUrl);
const runId = `backend-${Date.now()}`;
const prisma = integrationEnabled ? new PrismaClient({ datasourceUrl: testUrl }) : null;
let previouslyActiveTableIds: string[] = [];

describe.skipIf(!integrationEnabled)("PostgreSQL customer backend integration", () => {
  beforeAll(async () => {
    if (!prisma || !testUrl) return;
    if (testUrl === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL must not equal DATABASE_URL");
    process.env.DATABASE_URL = testUrl;
    process.env.RESEND_API_KEY = "";
    process.env.ADMIN_NOTIFICATION_EMAIL = "";
    await prisma.businessSetting.upsert({
      where: { id: "primary" },
      create: { id: "primary", reservationCutoffMinutes: 0 },
      update: { pickupEnabled: true, pickupLeadMinutes: 0, reservationEnabled: true, reservationCutoffMinutes: 0, openingHour: "08:00", closingHour: "23:00", reservationDurationMinutes: 90, reservationSlotMinutes: 30, maxGuestsPerReservation: 10 },
    });
    previouslyActiveTableIds = (await prisma.tableInventory.findMany({ where: { active: true }, select: { id: true } })).map((table) => table.id);
    await prisma.tableInventory.updateMany({ where: { id: { in: previouslyActiveTableIds } }, data: { active: false } });
    await prisma.tableInventory.create({ data: { name: runId, seats: 4 } });
    await prisma.menuItem.create({ data: {
      id: runId, slug: runId, name: "Integration Cortado", description: "Test item", longDescription: "Dedicated integration test item",
      category: "Signature Coffee", price: 333, dietary: ["vegetarian"], ingredients: ["coffee"], allergens: ["milk"],
    } });
  });

  afterAll(async () => {
    if (!prisma) return;
    const orders = await prisma.order.findMany({ where: { idempotencyKey: { startsWith: runId } }, select: { id: true } });
    const reservations = await prisma.reservation.findMany({ where: { idempotencyKey: { startsWith: runId } }, select: { id: true } });
    await prisma.emailDelivery.deleteMany({ where: { entityId: { in: [...orders, ...reservations].map((entry) => entry.id) } } });
    await prisma.order.deleteMany({ where: { idempotencyKey: { startsWith: runId } } });
    await prisma.reservation.deleteMany({ where: { idempotencyKey: { startsWith: runId } } });
    await prisma.customer.deleteMany({ where: { email: { contains: runId } } });
    await prisma.menuItem.deleteMany({ where: { id: runId } });
    await prisma.tableInventory.deleteMany({ where: { name: runId } });
    await prisma.tableInventory.updateMany({ where: { id: { in: previouslyActiveTableIds } }, data: { active: true } });
    await prisma.$disconnect();
  });

  it("persists an order with database pricing and replays duplicates safely", async () => {
    if (!prisma) return;
    const input = {
      customerName: "Integration Customer", mobile: "9876543210", email: `${runId}@example.com`, pickupTime: "45" as const, notes: "",
      idempotencyKey: `${runId}-order`, items: [{ menuItemId: runId, quantity: 2 }],
    };
    const first = await createOrder(input, prisma);
    const replay = await createOrder(input, prisma);
    expect(replay.id).toBe(first.id);
    expect(first.total).toBe(666);
    expect(first.paymentMethod).toBe("PAY_AT_COUNTER");
    expect(await prisma.order.count({ where: { idempotencyKey: input.idempotencyKey } })).toBe(1);
  });

  it("rejects unavailable products", async () => {
    if (!prisma) return;
    await prisma.menuItem.update({ where: { id: runId }, data: { available: false } });
    await expect(createOrder({
      customerName: "Integration Customer", mobile: "9876543210", email: `${runId}-off@example.com`, pickupTime: "45", notes: "",
      idempotencyKey: `${runId}-unavailable`, items: [{ menuItemId: runId, quantity: 1 }],
    }, prisma)).rejects.toThrow(`UNAVAILABLE_ITEM:${runId}`);
    await prisma.menuItem.update({ where: { id: runId }, data: { available: true } });
  });

  it("serializes concurrent reservations so capacity cannot be exceeded", async () => {
    if (!prisma) return;
    const date = new Date(Date.now() + 7 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const make = (suffix: string) => createReservation({
      name: `Guest ${suffix}`, email: `${runId}-${suffix}@example.com`, mobile: suffix === "a" ? "9876543210" : "9876543211",
      date, time: "18:00", guests: 3, requests: "", idempotencyKey: `${runId}-reservation-${suffix}`,
    }, prisma);
    const results = await Promise.allSettled([make("a"), make("b")]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(await prisma.reservation.count({ where: { idempotencyKey: { startsWith: `${runId}-reservation` } } })).toBe(1);
  });
});
