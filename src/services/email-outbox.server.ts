import { Prisma, type EmailDelivery, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { renderEmail, type EmailTemplatePayload } from "@/services/email-templates";
import { resendProvider, type EmailProvider } from "@/services/email-provider.server";

export const ADMIN_EMAIL_RECIPIENT = "ADMIN_NOTIFICATION_EMAIL";
export const emailEventId = (entityType: string, entityId: string, kind: string) => `${entityType}:${entityId}:${kind}`;

export async function enqueueEmail(transaction: Prisma.TransactionClient, input: { entityType: string; entityId: string; kind: string; recipient: string; payload: EmailTemplatePayload }) {
  const eventId = emailEventId(input.entityType, input.entityId, input.kind);
  return transaction.emailDelivery.upsert({
    where: { eventId },
    create: { eventId, entityType: input.entityType, entityId: input.entityId, kind: input.kind, recipient: input.recipient, payload: input.payload as unknown as Prisma.InputJsonValue },
    update: {},
  });
}

const canClaim = (job: EmailDelivery, now: Date) => (job.status === "PENDING" || job.status === "RETRYABLE" || (job.status === "PROCESSING" && Boolean(job.lockedAt && job.lockedAt < new Date(now.getTime() - 5 * 60_000)))) && job.nextAttemptAt <= now;
export const retryAt = (attempt: number, now: Date) => new Date(now.getTime() + Math.min(60, 2 ** Math.max(0, attempt - 1)) * 60_000);

async function synchronizeEntity(entityType: string, entityId: string, database: PrismaClient) {
  if (entityType !== "ORDER" && entityType !== "RESERVATION") return;
  const statuses = (await database.emailDelivery.findMany({ where: { entityType, entityId }, select: { status: true } })).map((entry) => entry.status);
  const accepted = statuses.filter((status) => ["ACCEPTED", "DELIVERED", "SENT"].includes(status)).length;
  const aggregate = accepted === statuses.length && statuses.length ? "ACCEPTED" : accepted ? "PARTIAL" : statuses.every((status) => ["FAILED", "SKIPPED"].includes(status)) ? "FAILED" : "PENDING";
  if (entityType === "ORDER") await database.order.update({ where: { id: entityId }, data: { emailStatus: aggregate } });
  else await database.reservation.update({ where: { id: entityId }, data: { emailStatus: aggregate } });
}

export async function processEmailEvent(eventId: string, database: PrismaClient = db, provider: EmailProvider = resendProvider) {
  const now = new Date();
  const candidate = await database.emailDelivery.findUnique({ where: { eventId } });
  if (!candidate || !canClaim(candidate, now)) return candidate;
  const claimed = await database.emailDelivery.updateMany({ where: { id: candidate.id, status: candidate.status, updatedAt: candidate.updatedAt }, data: { status: "PROCESSING", lockedAt: now, lastAttemptAt: now, attempts: { increment: 1 } } });
  if (!claimed.count) return null;
  const job = await database.emailDelivery.findUniqueOrThrow({ where: { id: candidate.id } });
  const recipient = job.recipient === ADMIN_EMAIL_RECIPIENT ? process.env.ADMIN_NOTIFICATION_EMAIL : job.recipient;
  if (!recipient) {
    const pending = await database.emailDelivery.update({ where: { id: job.id }, data: { status: "PENDING", lockedAt: null, lastError: "ADMIN_EMAIL_NOT_CONFIGURED", nextAttemptAt: new Date(now.getTime() + 60 * 60_000), attempts: { decrement: 1 } } });
    await synchronizeEntity(job.entityType, job.entityId, database);
    return pending;
  }
  const business = await database.businessSetting.findUnique({ where: { id: "primary" }, select: { displayName: true, address: true, phone: true, contactEmail: true } });
  const message = renderEmail(job.kind, job.payload as unknown as EmailTemplatePayload, business || {});
  const result = await provider.send({ to: recipient, subject: message.subject, html: message.html, eventId: job.eventId });
  if (result.outcome === "accepted") {
    const accepted = await database.emailDelivery.update({ where: { id: job.id }, data: { status: "ACCEPTED", providerId: result.providerId, providerStatus: result.providerStatus, acceptedAt: now, sentAt: now, lockedAt: null, lastError: null } });
    await synchronizeEntity(job.entityType, job.entityId, database);
    return accepted;
  }
  if (result.outcome === "not_configured") {
    const pending = await database.emailDelivery.update({ where: { id: job.id }, data: { status: "PENDING", lockedAt: null, lastError: result.reason, nextAttemptAt: new Date(now.getTime() + 60 * 60_000), attempts: { decrement: 1 } } });
    await synchronizeEntity(job.entityType, job.entityId, database);
    return pending;
  }
  const exhausted = job.attempts >= job.maxAttempts || result.outcome === "failed";
  const failed = await database.emailDelivery.update({ where: { id: job.id }, data: { status: exhausted ? "FAILED" : "RETRYABLE", lockedAt: null, lastError: result.reason, nextAttemptAt: exhausted ? job.nextAttemptAt : retryAt(job.attempts, now) } });
  await synchronizeEntity(job.entityType, job.entityId, database);
  return failed;
}

export async function processEntityEmails(entityType: string, entityId: string, database: PrismaClient = db, provider: EmailProvider = resendProvider) {
  const jobs = await database.emailDelivery.findMany({ where: { entityType, entityId }, select: { eventId: true } });
  await Promise.all(jobs.map((job) => processEmailEvent(job.eventId, database, provider)));
  return database.emailDelivery.findMany({ where: { entityType, entityId } });
}

export async function processPendingEmails(limit = 20, database: PrismaClient = db, provider: EmailProvider = resendProvider) {
  const now = new Date();
  const jobs = await database.emailDelivery.findMany({ where: { nextAttemptAt: { lte: now }, OR: [{ status: "PENDING" }, { status: "RETRYABLE" }, { status: "PROCESSING", lockedAt: { lt: new Date(now.getTime() - 5 * 60_000) } }] }, orderBy: { nextAttemptAt: "asc" }, take: Math.min(50, Math.max(1, limit)), select: { eventId: true } });
  const results = [];
  for (let offset = 0; offset < jobs.length; offset += 5) {
    results.push(...await Promise.all(jobs.slice(offset, offset + 5).map((job) => processEmailEvent(job.eventId, database, provider))));
  }
  return results;
}
