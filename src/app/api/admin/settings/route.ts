import { apiOk } from "@/lib/api";
import { adminApiError } from "@/lib/admin-api";
import { requireAdminMutation, requireAdminRole } from "@/lib/admin-auth";
import { readJson } from "@/lib/request";
import { businessSettingsSchema } from "@/lib/validation";
import { updateBusinessSettings } from "@/services/admin-management.server";

export async function PUT(request: Request) {
  try {
    const auth = await requireAdminMutation(request);
    requireAdminRole(auth, "OWNER");
    return apiOk(await updateBusinessSettings(businessSettingsSchema.parse(await readJson(request)), auth.admin.id));
  } catch (error) { return adminApiError(error); }
}
