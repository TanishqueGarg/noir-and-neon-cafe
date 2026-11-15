import { apiOk } from "@/lib/api";
import { adminApiError } from "@/lib/admin-api";
import { requireAdminMutation, requireAdminRole } from "@/lib/admin-auth";
import { readJson } from "@/lib/request";
import { tableUpdateSchema } from "@/lib/validation";
import { updateTableInventory } from "@/services/admin-management.server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminMutation(request);
    requireAdminRole(auth, "OWNER");
    const { id } = await context.params;
    return apiOk(await updateTableInventory(id, tableUpdateSchema.parse(await readJson(request, 4_096)), auth.admin.id));
  } catch (error) { return adminApiError(error); }
}
