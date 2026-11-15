import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { hashSecret, isSessionUsable, isValidCsrf, requireAdminRole, verifyAdminCredentials, type AuthenticatedAdmin } from "@/lib/admin-auth";
import { checkProductionEnvironment } from "@/lib/production-env";
import { menuCreateSchema } from "@/lib/validation";
import { canTransitionOrder, canTransitionReservation } from "@/services/admin-management.server";
import { emailEventId, retryAt } from "@/services/email-outbox.server";
import { resendProvider } from "@/services/email-provider.server";
import { renderEmail } from "@/services/email-templates";

describe("admin authentication rules", () => {
  it("rejects missing and invalid credentials without requiring a real account", async () => {
    expect(await verifyAdminCredentials(null, "wrong-password-value")).toBe(false);
    const passwordHash = await bcrypt.hash("a-secure-admin-password", 4);
    expect(await verifyAdminCredentials({ active: true, passwordHash }, "wrong-password-value")).toBe(false);
    expect(await verifyAdminCredentials({ active: false, passwordHash }, "a-secure-admin-password")).toBe(false);
  });

  it("rejects expired, revoked, and inactive sessions", () => {
    const future = new Date("2030-01-01T00:00:00Z");
    const now = new Date("2029-01-01T00:00:00Z");
    expect(isSessionUsable({ expiresAt: future, revokedAt: null }, { active: true }, now)).toBe(true);
    expect(isSessionUsable({ expiresAt: new Date("2028-01-01"), revokedAt: null }, { active: true }, now)).toBe(false);
    expect(isSessionUsable({ expiresAt: future, revokedAt: now }, { active: true }, now)).toBe(false);
    expect(isSessionUsable({ expiresAt: future, revokedAt: null }, { active: false }, now)).toBe(false);
  });

  it("uses a separate hashed CSRF secret", () => {
    const token = "csrf-token-from-secure-cookie";
    expect(isValidCsrf(token, hashSecret(token))).toBe(true);
    expect(isValidCsrf("different-token", hashSecret(token))).toBe(false);
  });

  it("limits business configuration to owners", () => {
    const manager = { admin: { role: "MANAGER" } } as AuthenticatedAdmin;
    const owner = { admin: { role: "OWNER" } } as AuthenticatedAdmin;
    expect(() => requireAdminRole(manager, "OWNER")).toThrowError(/owner access/i);
    expect(requireAdminRole(owner, "OWNER")).toBe(owner);
  });
});

describe("production configuration", () => {
  it("accepts separated pooled/direct URLs and independent secrets", () => {
    const result = checkProductionEnvironment({
      DATABASE_URL: "postgresql://runtime:secret@project-pooler.example.net/app?sslmode=require&pgbouncer=true",
      DIRECT_URL: "postgresql://migration:secret@project.example.net/app?sslmode=require",
      NEXT_PUBLIC_SITE_URL: "https://cafe.example",
      RESEND_API_KEY: "re_test_value_for_validation",
      EMAIL_FROM: "NOIR & NEON <orders@noirneon.in>",
      ADMIN_NOTIFICATION_EMAIL: "ops@noirneon.in",
      RATE_LIMIT_SALT: "r".repeat(32),
      CRON_SECRET: "c".repeat(32),
      ADMIN_SESSION_HOURS: "8",
      ALLOW_DEVELOPMENT_SEED: "false",
    });
    expect(result.errors).toEqual([]);
  });

  it("rejects unsafe production values without echoing their contents", () => {
    const result = checkProductionEnvironment({ DATABASE_URL: "not-a-url", DIRECT_URL: "", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" });
    expect(result.errors.length).toBeGreaterThan(5);
    expect(result.errors.join(" ")).not.toContain("not-a-url");
  });

  it("rejects remote menu imagery at the admin boundary", () => {
    const result = menuCreateSchema.safeParse({ slug: "unsafe-image", name: "Unsafe Image", description: "A sample item", longDescription: "A sufficiently long sample item description.", category: "Signature Coffee", price: 250, imageUrl: "https://unknown.example/image.jpg", ingredients: [], allergens: [] });
    expect(result.success).toBe(false);
  });
});

describe("safe administrative transitions", () => {
  it("permits only valid order transitions", () => {
    expect(canTransitionOrder("PENDING", "ACCEPTED")).toBe(true);
    expect(canTransitionOrder("PENDING", "COMPLETED")).toBe(false);
    expect(canTransitionOrder("COMPLETED", "READY")).toBe(false);
  });
  it("does not allow rejected reservations to be confirmed", () => {
    expect(canTransitionReservation("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransitionReservation("REJECTED", "CONFIRMED")).toBe(false);
  });
});

describe("transactional email", () => {
  it("renders branded, escaped order and reservation templates", () => {
    const order = renderEmail("ORDER_CUSTOMER", { customerName: "<script>alert(1)</script>", reference: "NN-100", total: 520, pickupTime: "2030-06-15T12:30:00.000Z", items: [{ name: "Cortado", quantity: 2, unitPrice: 260 }] });
    expect(order.html).toContain("NOIR");
    expect(order.html).toContain("NN-100");
    expect(order.html).not.toContain("<script>");
    const reservation = renderEmail("RESERVATION_CUSTOMER_CONFIRMED", { customerName: "Mira", reference: "RSV-1", reservationTime: "2030-06-15T12:30:00.000Z", guests: 2, status: "CONFIRMED" });
    expect(reservation.subject).toContain("confirmed");
    expect(reservation.html).toContain("CONFIRMED");
  });

  it("uses stable event identifiers and exponential retry delays", () => {
    expect(emailEventId("ORDER", "one", "ORDER_CUSTOMER")).toBe(emailEventId("ORDER", "one", "ORDER_CUSTOMER"));
    const now = new Date("2030-01-01T00:00:00Z");
    expect(retryAt(1, now).getTime() - now.getTime()).toBe(60_000);
    expect(retryAt(4, now).getTime() - now.getTime()).toBe(8 * 60_000);
  });

  it("reports missing Resend credentials without pretending acceptance", async () => {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM;
    try {
      await expect(resendProvider.send({ to: "customer@example.com", subject: "Test", html: "<p>Test</p>", eventId: "test:event" })).resolves.toEqual({ outcome: "not_configured", reason: "EMAIL_NOT_CONFIGURED" });
    } finally {
      if (key === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = key;
      if (from === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = from;
    }
  });
});
