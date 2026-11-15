import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { SetupRequiredError } from "@/lib/env";
import { assertSameOrigin, readJson, requestFingerprint, RequestError } from "@/lib/request";
import { enforceRateLimit } from "@/lib/rate-limit";
import { reservationRequestSchema } from "@/lib/validation";
import { createReservation } from "@/services/reservation.server";

const errors: Record<string, [string, number]> = {
  IDEMPOTENCY_CONFLICT: ["This submission key was already used for another request.", 409],
  SLOT_UNAVAILABLE: ["That time is no longer available. Choose another slot.", 409],
  INVALID_TIME_SLOT: ["Choose an available reservation time.", 400],
  BOOKING_CUTOFF: ["That time is too soon or has already passed.", 400],
  INVALID_DATE: ["Choose a valid reservation date and time.", 400],
  DATE_TOO_FAR: ["Choose a date within the next 90 days.", 400],
  GUEST_LIMIT: ["This party size is not available for online reservations.", 400],
  RESERVATIONS_DISABLED: ["Online reservations are currently unavailable.", 409],
  CAPACITY_NOT_CONFIGURED: ["Reservation capacity is not configured.", 503],
};
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const input = reservationRequestSchema.parse({ ...(body as object), idempotencyKey: request.headers.get("idempotency-key") || "" });
    await enforceRateLimit("reservations", requestFingerprint(request), 5, 10 * 60_000);
    return apiOk(await createReservation(input), 201);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError("VALIDATION_ERROR", error.issues[0]?.message || "Invalid reservation", 400);
    if (error instanceof SetupRequiredError) return apiError("SETUP_REQUIRED", "Reservation persistence is not configured. No request was created.", 503);
    if (error instanceof RequestError) return apiError(error.code, error.message, error.status);
    const message = error instanceof Error ? error.message : "";
    const mapped = errors[message];
    return mapped ? apiError(message, mapped[0], mapped[1]) : apiError("RESERVATION_FAILED", "The reservation request could not be saved.", 500);
  }
}
