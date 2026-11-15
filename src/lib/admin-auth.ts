import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import type { AdminRole, AdminSession, AdminUser } from "@prisma/client";
import { db } from "@/lib/db";
import { assertStrictSameOrigin } from "@/lib/request";
import { rateLimitSalt } from "@/lib/env";

export const ADMIN_SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-nn_admin_session" : "nn_admin_session";
export const ADMIN_CSRF_COOKIE = process.env.NODE_ENV === "production" ? "__Host-nn_admin_csrf" : "nn_admin_csrf";

export class AdminAuthError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) { super(message); }
}

export const hashSecret = (value: string) => createHash("sha256").update(value).digest("hex");
const safeEqual = (left: string, right: string) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};
export const isValidCsrf = (token: string, expectedHash: string) => Boolean(token) && safeEqual(hashSecret(token), expectedHash);

let dummyHash: Promise<string> | undefined;
export async function verifyAdminCredentials(admin: { active: boolean; passwordHash: string } | null, password: string) {
  dummyHash ??= bcrypt.hash("not-a-real-administrator-password", 12);
  const valid = await bcrypt.compare(password, admin?.passwordHash || await dummyHash);
  return Boolean(admin?.active && valid);
}

export function isSessionUsable(session: Pick<AdminSession, "expiresAt" | "revokedAt">, admin: Pick<AdminUser, "active">, now = new Date()) {
  return admin.active && !session.revokedAt && session.expiresAt > now;
}

export type AuthenticatedAdmin = { session: AdminSession; admin: { id: string; email: string; role: AdminRole; active: boolean } };

export async function getAdminSession(): Promise<AuthenticatedAdmin | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const record = await db.adminSession.findUnique({ where: { tokenHash: hashSecret(token) }, include: { admin: { select: { id: true, email: true, role: true, active: true } } } });
  if (!record || !isSessionUsable(record, record.admin)) return null;
  const agent = (await headers()).get("user-agent");
  if (record.userAgentHash && (!agent || !safeEqual(record.userAgentHash, hashSecret(agent)))) return null;
  if (record.lastSeenAt < new Date(Date.now() - 15 * 60_000)) await db.adminSession.update({ where: { id: record.id }, data: { lastSeenAt: new Date() } });
  return { session: record, admin: record.admin };
}

export async function requireAdminSession() {
  const auth = await getAdminSession();
  if (!auth) throw new AdminAuthError("UNAUTHORIZED", 401, "Admin authentication is required");
  return auth;
}

export async function requireAdminMutation(request: Request) {
  assertStrictSameOrigin(request);
  const auth = await requireAdminSession();
  const csrf = request.headers.get("x-csrf-token") || "";
  if (!isValidCsrf(csrf, auth.session.csrfHash)) throw new AdminAuthError("INVALID_CSRF", 403, "Security token is invalid or expired");
  return auth;
}

export function requireAdminRole(auth: AuthenticatedAdmin, ...allowed: AdminRole[]) {
  if (!allowed.includes(auth.admin.role)) throw new AdminAuthError("FORBIDDEN", 403, "This action requires owner access");
  return auth;
}

export async function createAdminSession(adminId: string, request: Request) {
  const token = randomBytes(32).toString("base64url");
  const csrf = randomBytes(32).toString("base64url");
  const hours = Math.min(24, Math.max(1, Number(process.env.ADMIN_SESSION_HOURS || 8)));
  const expiresAt = new Date(Date.now() + hours * 60 * 60_000);
  const agent = request.headers.get("user-agent");
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  await db.adminSession.create({ data: { adminId, tokenHash: hashSecret(token), csrfHash: hashSecret(csrf), expiresAt, userAgentHash: agent ? hashSecret(agent) : null, ipHash: forwarded ? hashSecret(`${rateLimitSalt()}:${forwarded}`) : null } });
  const jar = await cookies();
  const common = { secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", expires: expiresAt };
  jar.set(ADMIN_SESSION_COOKIE, token, { ...common, httpOnly: true });
  jar.set(ADMIN_CSRF_COOKIE, csrf, { ...common, httpOnly: false });
  return expiresAt;
}

export async function revokeCurrentAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) await db.adminSession.updateMany({ where: { tokenHash: hashSecret(token), revokedAt: null }, data: { revokedAt: new Date() } });
  jar.delete(ADMIN_SESSION_COOKIE);
  jar.delete(ADMIN_CSRF_COOKIE);
}
