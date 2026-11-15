import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { createAdminSession, verifyAdminCredentials } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { SetupRequiredError, rateLimitSalt, requireDatabaseUrl } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertStrictSameOrigin, readJson, requestFingerprint, RequestError } from "@/lib/request";
import { adminLoginSchema } from "@/lib/validation";
import { requestDigest } from "@/domain/idempotency";

export async function POST(request: Request) {
  try {
    assertStrictSameOrigin(request);
    requireDatabaseUrl();
    const input = adminLoginSchema.parse(await readJson(request, 4_096));
    await enforceRateLimit("admin-login-ip", requestFingerprint(request), 8, 15 * 60_000);
    await enforceRateLimit("admin-login-account", requestDigest(`${rateLimitSalt()}:${input.email}`), 6, 15 * 60_000);
    const admin = await db.adminUser.findUnique({ where: { email: input.email } });
    if (!await verifyAdminCredentials(admin, input.password)) return apiError("INVALID_CREDENTIALS", "Email or password is incorrect", 401);
    if (!admin) return apiError("INVALID_CREDENTIALS", "Email or password is incorrect", 401);
    const expiresAt = await createAdminSession(admin.id, request);
    await db.$transaction([
      db.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } }),
      db.auditLog.create({ data: { adminId: admin.id, action: "ADMIN_LOGIN", entityType: "ADMIN_SESSION" } }),
    ]);
    return apiOk({ email: admin.email, role: admin.role, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    if (error instanceof z.ZodError) return apiError("VALIDATION_ERROR", error.issues[0]?.message || "Invalid credentials", 400);
    if (error instanceof SetupRequiredError) return apiError("SETUP_REQUIRED", "Admin authentication is not configured", 503);
    if (error instanceof RequestError) return apiError(error.code, error.message, error.status);
    return apiError("LOGIN_FAILED", "Login could not be completed", 500);
  }
}
