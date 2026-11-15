import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { SetupRequiredError, requireDatabaseUrl } from "@/lib/env";
import { assertSameOrigin, readJson, requestFingerprint, RequestError } from "@/lib/request";
import { enforceRateLimit } from "@/lib/rate-limit";
import { newsletterSchema } from "@/lib/validation";
import { subscribeNewsletter } from "@/services/newsletter.server";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = newsletterSchema.parse(await readJson(request, 2_048));
    requireDatabaseUrl();
    await enforceRateLimit("newsletter", requestFingerprint(request), 5, 60 * 60_000);
    const result = await subscribeNewsletter(input.email);
    return apiOk(result, result.alreadySubscribed ? 200 : 201);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError("VALIDATION_ERROR", "Enter a valid email address.", 400);
    if (error instanceof SetupRequiredError) return apiError("SETUP_REQUIRED", "Newsletter persistence is not configured. Your address was not saved.", 503);
    if (error instanceof RequestError) return apiError(error.code, error.message, error.status);
    return apiError("SUBSCRIPTION_FAILED", "Subscription could not be saved.", 500);
  }
}
