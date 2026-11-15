import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { SetupRequiredError } from "@/lib/env";
import { assertSameOrigin, readJson, requestFingerprint, RequestError } from "@/lib/request";
import { enforceRateLimit } from "@/lib/rate-limit";
import { orderRequestSchema } from "@/lib/validation";
import { createOrder } from "@/services/order.server";

const errors: Record<string, [string, number]> = {
  IDEMPOTENCY_CONFLICT: ["This submission key was already used for a different order.", 409],
  INVALID_PICKUP_TIME: ["Choose a valid pickup time.", 400],
  PICKUP_DISABLED: ["Online pickup is currently unavailable.", 409],
};
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const input = orderRequestSchema.parse({ ...(body as object), idempotencyKey: request.headers.get("idempotency-key") || "" });
    await enforceRateLimit("orders", requestFingerprint(request), 5, 10 * 60_000);
    return apiOk(await createOrder(input), 201);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError("VALIDATION_ERROR", error.issues[0]?.message || "Invalid order", 400);
    if (error instanceof SetupRequiredError) return apiError("SETUP_REQUIRED", "Order persistence is not configured. No order was created.", 503);
    if (error instanceof RequestError) return apiError(error.code, error.message, error.status);
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("UNAVAILABLE_ITEM:")) return apiError("ITEM_UNAVAILABLE", "One or more menu items are unavailable. Refresh the menu and try again.", 409);
    const mapped = errors[message];
    return mapped ? apiError(message, mapped[0], mapped[1]) : apiError("ORDER_FAILED", "The order could not be saved. Please try again.", 500);
  }
}
