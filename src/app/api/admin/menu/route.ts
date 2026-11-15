import { apiOk } from "@/lib/api";
import { adminApiError } from "@/lib/admin-api";
import { requireAdminMutation } from "@/lib/admin-auth";
import { readJson } from "@/lib/request";
import { menuCreateSchema } from "@/lib/validation";
import { createMenuItem } from "@/services/admin-management.server";

export async function POST(request: Request) {
  try {
    const auth = await requireAdminMutation(request);
    const input = menuCreateSchema.parse(await readJson(request));
    return apiOk(await createMenuItem(input, auth.admin.id), 201);
  } catch (error) { return adminApiError(error); }
}
