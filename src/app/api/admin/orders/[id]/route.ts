import { apiOk } from "@/lib/api";
import { adminApiError } from "@/lib/admin-api";
import { requireAdminMutation } from "@/lib/admin-auth";
import { readJson } from "@/lib/request";
import { orderStatusSchema } from "@/lib/validation";
import { updateOrderStatus } from "@/services/admin-management.server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminMutation(request);
    const { id } = await context.params;
    const input = orderStatusSchema.parse((await readJson(request, 2_048) as { status?: unknown }).status);
    return apiOk(await updateOrderStatus(id, input, auth.admin.id));
  } catch (error) { return adminApiError(error); }
}
