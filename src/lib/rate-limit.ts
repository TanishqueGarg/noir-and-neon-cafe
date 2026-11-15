import { db } from "@/lib/db";
import { requireDatabaseUrl } from "@/lib/env";
import { RequestError } from "@/lib/request";

export async function enforceRateLimit(route: string, fingerprint: string, limit: number, windowMs: number) {
  requireDatabaseUrl();
  const bucket = Math.floor(Date.now() / windowMs);
  const key = `${route}:${fingerprint}:${bucket}`;
  const windowStart = new Date(bucket * windowMs);
  const result = await db.submissionGuard.upsert({
    where: { key },
    create: { key, route, windowStart, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  if (result.count > limit) throw new RequestError("RATE_LIMITED", "Too many requests. Please wait and try again.", 429);
}

export async function pruneSecurityState(now = new Date()) {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000);
  const [guards, sessions] = await db.$transaction([
    db.submissionGuard.deleteMany({ where: { windowStart: { lt: sevenDaysAgo } } }),
    db.adminSession.deleteMany({ where: { OR: [{ expiresAt: { lt: sevenDaysAgo } }, { revokedAt: { lt: sevenDaysAgo } }] } }),
  ]);
  return { rateLimitBuckets: guards.count, adminSessions: sessions.count };
}
