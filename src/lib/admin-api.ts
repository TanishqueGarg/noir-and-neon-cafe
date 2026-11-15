import { z } from "zod";
import { apiError } from "@/lib/api";
import { AdminAuthError } from "@/lib/admin-auth";
import { RequestError } from "@/lib/request";

export function adminApiError(error: unknown) {
  if (error instanceof AdminAuthError) return apiError(error.code, error.message, error.status);
  if (error instanceof RequestError) return apiError(error.code, error.message, error.status);
  if (error instanceof z.ZodError) return apiError("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request", 400);
  const code = error instanceof Error ? error.message : "";
  const conflicts: Record<string, string> = {
    INVALID_STATUS_TRANSITION: "That status transition is not allowed.",
    CONCURRENT_UPDATE: "This record changed while you were editing it. Refresh and try again.",
    RESERVATION_CAPACITY_CONFLICT: "The reservation cannot be confirmed because capacity is no longer available.",
    CAPACITY_BELOW_BOOKINGS: "Capacity cannot be reduced below existing pending or confirmed reservations.",
    RECORD_NOT_FOUND: "The requested record was not found.",
  };
  if (conflicts[code]) return apiError(code, conflicts[code], code === "RECORD_NOT_FOUND" ? 404 : 409);
  return apiError("ADMIN_OPERATION_FAILED", "The operation could not be completed", 500);
}
