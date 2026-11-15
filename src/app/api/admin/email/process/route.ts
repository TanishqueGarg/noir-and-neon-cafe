import { apiError, apiOk } from "@/lib/api";
import { AdminAuthError, requireAdminMutation } from "@/lib/admin-auth";
import { RequestError } from "@/lib/request";
import { processPendingEmails } from "@/services/email-outbox.server";

export async function POST(request: Request) {
  try {
    await requireAdminMutation(request);
    const jobs = await processPendingEmails(20);
    return apiOk({ processed: jobs.length });
  } catch (error) {
    if (error instanceof AdminAuthError) return apiError(error.code, error.message, error.status);
    if (error instanceof RequestError) return apiError(error.code, error.message, error.status);
    return apiError("EMAIL_PROCESS_FAILED", "Email jobs could not be processed", 500);
  }
}
