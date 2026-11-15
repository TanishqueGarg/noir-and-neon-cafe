import { apiOk } from "@/lib/api";
import { adminApiError } from "@/lib/admin-api";
import { requireAdminMutation, requireAdminRole } from "@/lib/admin-auth";
import { readJson } from "@/lib/request";
import { tableCreateSchema } from "@/lib/validation";
import { createTableInventory } from "@/services/admin-management.server";

export async function POST(request: Request) {
  try {
    const auth = await requireAdminMutation(request);
    requireAdminRole(auth, "OWNER");
    return apiOk(await createTableInventory(tableCreateSchema.parse(await readJson(request, 4_096)), auth.admin.id), 201);
  } catch (error) { return adminApiError(error); }
}
