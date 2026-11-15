import { apiOk } from "@/lib/api";
import { adminApiError } from "@/lib/admin-api";
import { requireAdminMutation } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { readJson } from "@/lib/request";
import { inquiryAdminSchema } from "@/lib/validation";
import { recordAudit } from "@/services/audit.server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminMutation(request);
    const { id } = await context.params;
    const input = inquiryAdminSchema.parse(await readJson(request, 2_048));
    const inquiry = await db.$transaction(async (tx) => {
      const exists = await tx.contactInquiry.findUnique({ where: { id } });
      if (!exists) throw new Error("RECORD_NOT_FOUND");
      const updated = await tx.contactInquiry.update({ where: { id }, data: input });
      await recordAudit(tx, { adminId: auth.admin.id, action: "CONTACT_RESOLVED", entityType: "CONTACT_INQUIRY", entityId: id });
      return updated;
    });
    return apiOk(inquiry);
  } catch (error) { return adminApiError(error); }
}
