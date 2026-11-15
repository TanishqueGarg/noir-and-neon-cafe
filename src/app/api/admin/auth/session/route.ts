import { apiError, apiOk } from "@/lib/api";
import { AdminAuthError, requireAdminSession } from "@/lib/admin-auth";

export async function GET() {
  try {
    const auth = await requireAdminSession();
    return apiOk({ email: auth.admin.email, role: auth.admin.role, expiresAt: auth.session.expiresAt.toISOString() });
  } catch (error) {
    if (error instanceof AdminAuthError) return apiError(error.code, error.message, error.status);
    return apiError("SESSION_FAILED", "Session could not be checked", 500);
  }
}
