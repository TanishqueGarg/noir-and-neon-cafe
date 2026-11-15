import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { SetupRequiredError } from "@/lib/env";
import { availabilityQuerySchema } from "@/lib/validation";
import { getAvailability } from "@/services/reservation.server";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const input = availabilityQuerySchema.parse({ date: url.searchParams.get("date"), guests: url.searchParams.get("guests") });
    return apiOk(await getAvailability(input.date, input.guests));
  } catch (error) {
    if (error instanceof z.ZodError) return apiError("VALIDATION_ERROR", "Choose a valid date and guest count.", 400);
    if (error instanceof SetupRequiredError) return apiError("SETUP_REQUIRED", "Live availability requires database configuration.", 503);
    const code = error instanceof Error ? error.message : "";
    if (code === "INVALID_DATE" || code === "BOOKING_CUTOFF") return apiError("INVALID_DATE", "Choose today or a future date.", 400);
    if (code === "DATE_TOO_FAR") return apiError(code, "Choose a date within the next 90 days.", 400);
    if (code === "GUEST_LIMIT") return apiError(code, "This party size is not available online.", 400);
    if (code === "RESERVATIONS_DISABLED") return apiError(code, "Online reservations are currently unavailable.", 409);
    if (code === "CAPACITY_NOT_CONFIGURED") return apiError(code, "Reservation capacity is not configured.", 503);
    return apiError("AVAILABILITY_FAILED", "Availability could not be loaded.", 500);
  }
}
