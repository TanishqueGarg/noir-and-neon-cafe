import { apiOk } from "@/lib/api";
import { adminApiError } from "@/lib/admin-api";
import { requireAdminMutation } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { readJson } from "@/lib/request";
import { subscriberAdminSchema } from "@/lib/validation";
import { recordAudit } from "@/services/audit.server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminMutation(request);
    const { id } = await context.params;
    const input = subscriberAdminSchema.parse(await readJson(request, 2_048));
    const subscriber = await db.$transaction(async (tx) => {
      const exists = await tx.newsletterSubscriber.findUnique({ where: { id } });
      if (!exists) throw new Error("RECORD_NOT_FOUND");
      const updated = await tx.newsletterSubscriber.update({ where: { id }, data: { active: input.active, unsubscribedAt: input.active ? null : new Date(), ...(input.active ? { consentedAt: new Date() } : {}) } });
      await recordAudit(tx, { adminId: auth.admin.id, action: input.active ? "SUBSCRIBER_REACTIVATED" : "SUBSCRIBER_DEACTIVATED", entityType: "NEWSLETTER_SUBSCRIBER", entityId: id });
      return updated;
    });
    return apiOk(subscriber);
  } catch (error) { return adminApiError(error); }
}
