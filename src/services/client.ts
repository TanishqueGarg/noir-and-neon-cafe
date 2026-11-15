import type { ApiResponse, AvailabilitySlot, OrderInput, OrderReceipt, ReservationInput, ReservationReceipt } from "@/types";

async function request<T>(url: string, body: unknown, idempotencyKey?: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) }, body: JSON.stringify(body) });
    return await response.json() as ApiResponse<T>;
  } catch { return { ok: false, error: { code: "NETWORK_ERROR", message: "Could not reach the server. Please try again." } }; }
}
export const orderClient = { create: (input: OrderInput, key: string) => request<OrderReceipt>("/api/orders", input, key) };
export const reservationClient = {
  create: (input: ReservationInput, key: string) => request<ReservationReceipt>("/api/reservations", input, key),
  availability: async (date: string, guests: number): Promise<ApiResponse<AvailabilitySlot[]>> => {
    try { return await (await fetch(`/api/reservations/availability?date=${encodeURIComponent(date)}&guests=${guests}`, { cache: "no-store" })).json(); }
    catch { return { ok: false, error: { code: "NETWORK_ERROR", message: "Availability could not be loaded." } }; }
  },
};
