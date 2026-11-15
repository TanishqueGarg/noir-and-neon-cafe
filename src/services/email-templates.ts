import { formatINR } from "@/lib/utils";

export const escapeEmailHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);

export interface EmailBusinessDetails {
  displayName?: string | null;
  address?: string | null;
  phone?: string | null;
  contactEmail?: string | null;
}

export interface OrderEmailPayload {
  customerName: string;
  reference: string;
  total: number;
  pickupTime: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
}

export interface ReservationEmailPayload {
  customerName: string;
  reference: string;
  reservationTime: string;
  guests: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
}

export interface ContactEmailPayload {
  customerName: string;
  subject: string;
  inquiryId: string;
}

export type EmailTemplatePayload = OrderEmailPayload | ReservationEmailPayload | ContactEmailPayload;

const paragraph = (value: string) => `<p style="margin:0 0 16px;line-height:1.75;color:#c5c9d1">${value}</p>`;
const detail = (label: string, value: string) => `<tr><td style="padding:9px 0;color:#969caa;font-size:12px;text-transform:uppercase;letter-spacing:.08em">${escapeEmailHtml(label)}</td><td style="padding:9px 0;text-align:right;color:#e7e8e3;font-weight:700">${value}</td></tr>`;

function frame(title: string, preview: string, body: string, business: EmailBusinessDetails = {}) {
  const name = escapeEmailHtml(business.displayName || "NOIR & NEON");
  const contact = [business.contactEmail, business.phone, business.address].filter(Boolean).map((value) => escapeEmailHtml(String(value))).join(" · ");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${escapeEmailHtml(title)}</title></head><body style="margin:0;background:#080a0f;color:#e7e8e3;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeEmailHtml(preview)}</div><div style="max-width:640px;margin:auto;padding:36px 18px"><div style="font-size:23px;font-weight:900;letter-spacing:.08em">${name.replace("&amp;", '<span style="color:#a5bd4f">&amp;</span>')}</div><div style="margin-top:26px;border:1px solid #252b38;background:#10141d;padding:30px 26px"><p style="margin:0 0 10px;color:#a5bd4f;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase">Brewed after dark</p><h1 style="margin:0 0 22px;font-size:30px;line-height:1.1;color:#e7e8e3">${escapeEmailHtml(title)}</h1>${body}</div><p style="margin:18px 0 0;color:#969caa;font-size:12px;line-height:1.7">${contact || "Contact details will be available from the café team."}</p></div></body></html>`;
}

const reservationDate = (value: string) => escapeEmailHtml(new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value)));

export function renderEmail(kind: string, payload: EmailTemplatePayload, business: EmailBusinessDetails = {}) {
  if (kind === "ORDER_CUSTOMER" || kind === "ORDER_STAFF") {
    const order = payload as OrderEmailPayload;
    const rows = order.items.map((item) => `<tr><td style="padding:8px 0;color:#c5c9d1">${escapeEmailHtml(item.name)} × ${item.quantity}</td><td style="padding:8px 0;text-align:right;color:#e7e8e3">${formatINR(item.unitPrice * item.quantity)}</td></tr>`).join("");
    const table = `<table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #252b38;border-bottom:1px solid #252b38;margin:20px 0">${rows}${detail("Total", formatINR(order.total))}${detail("Pickup", reservationDate(order.pickupTime))}</table>`;
    return kind === "ORDER_CUSTOMER"
      ? { subject: `Order ${order.reference} received`, html: frame("Your pickup order is in the queue.", `Order ${order.reference} was saved.`, paragraph(`Hello ${escapeEmailHtml(order.customerName)}, your pay-at-counter order has been saved with reference <strong>${escapeEmailHtml(order.reference)}</strong>.`) + table + paragraph("The café team still needs to accept the order. Keep this reference and pay at the counter when collecting."), business) }
      : { subject: `New pickup order ${order.reference}`, html: frame("A new pickup order was saved.", `New order ${order.reference}.`, paragraph(`Order <strong>${escapeEmailHtml(order.reference)}</strong> from ${escapeEmailHtml(order.customerName)} requires review.`) + table + paragraph("Open the protected admin dashboard to accept or reject it."), business) };
  }
  if (kind.startsWith("RESERVATION_")) {
    const reservation = payload as ReservationEmailPayload;
    const statusCopy = reservation.status === "CONFIRMED" ? ["Your table is confirmed.", "Please arrive on time; the team will hold the table according to café policy."] : reservation.status === "REJECTED" ? ["Your table request could not be accepted.", "No table has been reserved. Contact the café if you would like help choosing another time."] : reservation.status === "CANCELLED" ? ["Your reservation has been cancelled.", "This table is no longer being held."] : ["Your table request is pending review.", "This is an acknowledgement, not a confirmed reservation. The café will send a separate status update."];
    const summary = `<table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #252b38;border-bottom:1px solid #252b38;margin:20px 0">${detail("Reference", escapeEmailHtml(reservation.reference))}${detail("When", reservationDate(reservation.reservationTime))}${detail("Guests", String(reservation.guests))}${detail("Status", escapeEmailHtml(reservation.status))}</table>`;
    if (kind === "RESERVATION_STAFF") return { subject: `New table request ${reservation.reference}`, html: frame("A new table request needs review.", `Reservation ${reservation.reference} is pending.`, paragraph(`${escapeEmailHtml(reservation.customerName)} requested a table.`) + summary + paragraph("Review capacity and respond from the protected admin dashboard."), business) };
    return { subject: `Reservation ${reservation.reference}: ${reservation.status.toLowerCase()}`, html: frame(statusCopy[0], `Reservation ${reservation.reference} is ${reservation.status.toLowerCase()}.`, paragraph(`Hello ${escapeEmailHtml(reservation.customerName)}.`) + summary + paragraph(statusCopy[1]), business) };
  }
  const contact = payload as ContactEmailPayload;
  return { subject: `Contact inquiry: ${contact.subject}`, html: frame("A new contact inquiry was saved.", `Inquiry from ${contact.customerName}.`, paragraph(`<strong>${escapeEmailHtml(contact.customerName)}</strong> submitted “${escapeEmailHtml(contact.subject)}”.`) + paragraph(`Inquiry ID: <strong>${escapeEmailHtml(contact.inquiryId)}</strong>. View the full message in the protected admin dashboard.`), business) };
}
