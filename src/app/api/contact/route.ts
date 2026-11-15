import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";
import { SetupRequiredError, requireDatabaseUrl } from "@/lib/env";
import { assertSameOrigin, readJson, requestFingerprint, RequestError } from "@/lib/request";
import { enforceRateLimit } from "@/lib/rate-limit";
import { contactSchema } from "@/lib/validation";
import { ADMIN_EMAIL_RECIPIENT, enqueueEmail, processEntityEmails } from "@/services/email-outbox.server";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = contactSchema.parse(await readJson(request, 8_192));
    requireDatabaseUrl();
    await enforceRateLimit("contact", requestFingerprint(request), 3, 15 * 60_000);
    const inquiry = await db.$transaction(async (transaction) => {
      const saved = await transaction.contactInquiry.create({ data: input });
      await enqueueEmail(transaction, { entityType: "CONTACT", entityId: saved.id, kind: "CONTACT_STAFF", recipient: ADMIN_EMAIL_RECIPIENT, payload: { customerName: input.name, subject: input.subject, inquiryId: saved.id } });
      return saved;
    });
    try { await processEntityEmails("CONTACT", inquiry.id); } catch { /* The inquiry is safely persisted and the outbox remains retryable. */ }
    const email = await db.emailDelivery.findUnique({ where: { eventId: `CONTACT:${inquiry.id}:CONTACT_STAFF` }, select: { status: true } });
    return apiOk({ id: inquiry.id, saved: true, emailAccepted: Boolean(email && ["ACCEPTED", "DELIVERED", "SENT"].includes(email.status)) }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError("VALIDATION_ERROR", error.issues[0]?.message || "Invalid inquiry", 400);
    if (error instanceof SetupRequiredError) return apiError("SETUP_REQUIRED", "Contact persistence is not configured. Your message was not saved.", 503);
    if (error instanceof RequestError) return apiError(error.code, error.message, error.status);
    return apiError("CONTACT_FAILED", "Your message could not be saved. Please try again.", 500);
  }
}
