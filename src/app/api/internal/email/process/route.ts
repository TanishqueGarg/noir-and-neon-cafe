import { timingSafeEqual } from "node:crypto";
import { apiError, apiOk } from "@/lib/api";
import { hashSecret } from "@/lib/admin-auth";
import { pruneSecurityState } from "@/lib/rate-limit";
import { processPendingEmails } from "@/services/email-outbox.server";

const equal = (left: string, right: string) => {
  const a = Buffer.from(hashSecret(left));
  const b = Buffer.from(hashSecret(right));
  return timingSafeEqual(a, b);
};

async function handleProcess(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") || "";
  if (!secret || !authorization.startsWith("Bearer ") || !equal(authorization.slice(7), secret)) return apiError("UNAUTHORIZED", "Unauthorized", 401);
  try {
    const jobs = await processPendingEmails(20);
    const maintenance = await pruneSecurityState().catch(() => null);
    return apiOk({ processed: jobs.length, maintenance });
  } catch {
    return apiError("EMAIL_PROCESS_FAILED", "Email jobs could not be processed", 500);
  }
}

export const GET = handleProcess;
export const POST = handleProcess;
