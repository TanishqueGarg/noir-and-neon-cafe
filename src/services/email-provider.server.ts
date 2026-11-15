import { Resend } from "resend";

export type ProviderResult =
  | { outcome: "accepted"; providerId: string; providerStatus: "accepted" }
  | { outcome: "retryable" | "failed" | "not_configured"; reason: string };

export interface EmailProvider {
  send(message: { to: string; subject: string; html: string; eventId: string }): Promise<ProviderResult>;
}

const permanentErrors = new Set(["validation_error", "invalid_parameter", "missing_required_field", "invalid_api_key", "restricted_api_key"]);

export const resendProvider: EmailProvider = {
  async send(message) {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!key || !from || key.startsWith("re_x")) return { outcome: "not_configured", reason: "EMAIL_NOT_CONFIGURED" };
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const configuredTimeout = Number(process.env.EMAIL_SEND_TIMEOUT_MS || 8_000);
      const timeoutMs = Number.isFinite(configuredTimeout) ? Math.min(15_000, Math.max(1_000, configuredTimeout)) : 8_000;
      const response = await Promise.race([
        new Resend(key).emails.send({ from, to: message.to, subject: message.subject, html: message.html }, { idempotencyKey: message.eventId }),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("EMAIL_PROVIDER_TIMEOUT")), timeoutMs); }),
      ]);
      if (response.data?.id) return { outcome: "accepted", providerId: response.data.id, providerStatus: "accepted" };
      const name = String(response.error?.name || "provider_error").toLowerCase();
      return { outcome: permanentErrors.has(name) ? "failed" : "retryable", reason: response.error?.message || "PROVIDER_REJECTED" };
    } catch {
      return { outcome: "retryable", reason: "PROVIDER_UNAVAILABLE" };
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  },
};
