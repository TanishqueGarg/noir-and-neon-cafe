import { describe, expect, it } from "vitest";
import { priceOrder } from "@/domain/order";
import { assertMatchingRequest, requestDigest } from "@/domain/idempotency";
import { assertBookableDate, availabilityForSlots, localDateTimeToUtc } from "@/domain/reservation";
import { SetupRequiredError, requireDatabaseUrl } from "@/lib/env";
import { contactSchema, orderRequestSchema } from "@/lib/validation";
import { subscribeNewsletter, type NewsletterRepository } from "@/services/newsletter.server";

describe("order validation and server pricing", () => {
  it("uses catalog prices and ignores a manipulated client price", () => {
    const input = orderRequestSchema.parse({
      customerName: "Aarav Shah",
      mobile: "9876543210",
      email: "aarav@example.com",
      pickupTime: "45",
      idempotencyKey: "06387b46-8eab-4a72-aabc-145d773bba44",
      items: [{ menuItemId: "coffee-1", quantity: 2, price: 1 }],
    });
    expect(input.items[0]).not.toHaveProperty("price");
    expect(priceOrder(input.items, [{ id: "coffee-1", name: "Cortado", price: 260, active: true, available: true }]).subtotal).toBe(520);
  });

  it("rejects missing and unavailable products", () => {
    expect(() => priceOrder([{ menuItemId: "missing", quantity: 1 }], [])).toThrow("UNAVAILABLE_ITEM:missing");
    expect(() => priceOrder([{ menuItemId: "off", quantity: 1 }], [{ id: "off", name: "Off", price: 200, active: true, available: false }])).toThrow("UNAVAILABLE_ITEM:off");
  });

  it("enforces the maximum quantity of ten per product", () => {
    const result = orderRequestSchema.safeParse({
      customerName: "Aarav Shah", mobile: "9876543210", email: "aarav@example.com", pickupTime: "ASAP",
      idempotencyKey: "06387b46-8eab-4a72-aabc-145d773bba44", items: [{ menuItemId: "coffee-1", quantity: 11 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("submission idempotency", () => {
  it("is stable across object-key order and rejects changed payloads", () => {
    const left = { customer: "A", items: [{ id: "x", quantity: 1 }] };
    const same = { items: [{ quantity: 1, id: "x" }], customer: "A" };
    expect(requestDigest(left)).toBe(requestDigest(same));
    expect(() => assertMatchingRequest(requestDigest(left), same)).not.toThrow();
    expect(() => assertMatchingRequest(requestDigest(left), { ...same, customer: "B" })).toThrow("IDEMPOTENCY_CONFLICT");
  });
});

describe("reservation rules", () => {
  it("marks a slot unavailable when overlapping requests consume capacity", () => {
    const slots = availabilityForSlots({
      date: "2030-06-15", slots: ["18:00"], guests: 3, capacity: 6, durationMinutes: 90, cutoffMinutes: 0,
      now: new Date("2030-06-14T00:00:00Z"),
      reservations: [{ reservationTime: localDateTimeToUtc("2030-06-15", "17:30"), durationMinutes: 90, guests: 4 }],
    });
    expect(slots[0]).toMatchObject({ status: "unavailable", remainingSeats: 2 });
  });

  it("rejects impossible calendar dates and past bookings", () => {
    expect(() => assertBookableDate("2030-02-30", "18:00", 0, new Date("2029-01-01"))).toThrow("INVALID_DATE");
    expect(() => assertBookableDate("2020-01-01", "18:00", 0, new Date("2029-01-01"))).toThrow("BOOKING_CUTOFF");
  });
});

describe("public submission validation", () => {
  it("validates contact input", () => {
    expect(contactSchema.safeParse({ name: "A", email: "bad", subject: "x", message: "short" }).success).toBe(false);
    expect(contactSchema.safeParse({ name: "Mira Roy", email: "mira@example.com", subject: "Private event", message: "Please share availability for a small event." }).success).toBe(true);
  });

  it("returns an honest duplicate newsletter result", async () => {
    let record: { active: boolean } | null = null;
    const repository: NewsletterRepository = {
      findByEmail: async () => record,
      create: async () => { record = { active: true }; },
      reactivate: async () => { record = { active: true }; },
    };
    expect(await subscribeNewsletter("reader@example.com", repository)).toMatchObject({ subscribed: true, alreadySubscribed: false });
    expect(await subscribeNewsletter("reader@example.com", repository)).toEqual({ subscribed: true, alreadySubscribed: true, reactivated: false });
  });

  it("reports missing database configuration", () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      expect(() => requireDatabaseUrl()).toThrow(SetupRequiredError);
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });
});
