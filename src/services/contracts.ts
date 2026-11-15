import type { ApiResponse, AvailabilitySlot, OrderReceipt, ReservationReceipt } from "@/types";
import type { OrderRequest, ReservationRequest } from "@/lib/validation";

export interface OrderService { create(input: OrderRequest): Promise<ApiResponse<OrderReceipt>> }
export interface ReservationService {
  checkAvailability(date: string, guests: number): Promise<ApiResponse<AvailabilitySlot[]>>;
  create(input: ReservationRequest): Promise<ApiResponse<ReservationReceipt>>;
}
export interface EmailResult { accepted: boolean; providerId?: string; reason?: string }
export interface EmailService {
  sendOrderAcknowledgement(to: string, reference: string, total: number): Promise<EmailResult>;
  sendReservationAcknowledgement(to: string, reference: string, dateTime: Date): Promise<EmailResult>;
  sendStaffNotification(subject: string, html: string): Promise<EmailResult>;
}
