import { apiError, apiOk } from "@/lib/api";
import { AdminAuthError, requireAdminMutation, revokeCurrentAdminSession } from "@/lib/admin-auth";
import { RequestError } from "@/lib/request";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const auth = await requireAdminMutation(request);
    await db.auditLog.create({ data: { adminId: auth.admin.id, action: "ADMIN_LOGOUT", entityType: "ADMIN_SESSION", entityId: auth.session.id } });
    await revokeCurrentAdminSession();
    return apiOk({ loggedOut: true });
  } catch (error) {
    if (error instanceof AdminAuthError) return apiError(error.code, error.message, error.status);
    if (error instanceof RequestError) return apiError(error.code, error.message, error.status);
    return apiError("LOGOUT_FAILED", "Logout could not be completed", 500);
  }
}
