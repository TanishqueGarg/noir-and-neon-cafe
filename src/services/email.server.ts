import { Resend } from "resend";
import type { EmailResult } from "@/services/contracts";
import { formatINR } from "@/lib/utils";

export const escapeEmailHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
const frame = (title: string, body: string) => `<!doctype html><html><body style="margin:0;background:#080A0F;color:#E7E8E3;font-family:Arial,sans-serif"><div style="max-width:640px;margin:auto;padding:40px 24px"><div style="font-size:22px;font-weight:800;letter-spacing:.08em">NOIR <span style="color:#A5BD4F">&amp;</span> NEON</div><div style="margin-top:28px;border:1px solid #252B38;background:#10141D;padding:28px"><p style="margin:0 0 8px;color:#A5BD4F;font-size:12px;letter-spacing:.12em;text-transform:uppercase">Brewed after dark</p><h1 style="margin:0 0 20px;font-size:30px">${escapeEmailHtml(title)}</h1>${body}</div><p style="color:#969CAA;font-size:12px;line-height:1.6;margin-top:20px">This transactional message relates to your NOIR &amp; NEON request. Reply to the café contact address if you need help.</p></div></body></html>`;

async function send(to: string, subject: string, html: string): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from || key.startsWith("re_x")) return { accepted: false, reason: "EMAIL_NOT_CONFIGURED" };
  try {
    const response = await new Resend(key).emails.send({ from, to, subject, html });
    if (response.error || !response.data?.id) return { accepted: false, reason: response.error?.message || "PROVIDER_REJECTED" };
    return { accepted: true, providerId: response.data.id };
  } catch { return { accepted: false, reason: "PROVIDER_UNAVAILABLE" }; }
}

export const transactionalEmail = {
  orderAcknowledgement: (to: string, reference: string, total: number) => send(to, `Order ${reference} received`, frame("Your pickup order is in the queue.", `<p style="line-height:1.7">Reference <strong>${escapeEmailHtml(reference)}</strong></p><p style="font-size:24px"><strong>${formatINR(total)}</strong></p><p style="color:#969CAA">Payment is due at the café counter. This acknowledgement does not mean the order has been accepted yet.</p>`)),
  reservationAcknowledgement: (to: string, reference: string, dateTime: Date) => send(to, `Reservation request ${reference}`, frame("We received your table request.", `<p style="line-height:1.7">Reference <strong>${escapeEmailHtml(reference)}</strong><br>${escapeEmailHtml(new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(dateTime))}</p><p style="color:#969CAA">Status: pending staff approval. We will send a separate message only after the table is confirmed.</p>`)),
  staff: (subject: string, html: string) => {
    const to = process.env.ADMIN_NOTIFICATION_EMAIL;
    return to ? send(to, subject, frame(subject, html)) : Promise.resolve({ accepted: false, reason: "ADMIN_EMAIL_NOT_CONFIGURED" });
  },
};
