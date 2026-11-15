import { createHash } from "node:crypto";
import { apiError } from "@/lib/api";
import { rateLimitSalt, siteUrl } from "@/lib/env";

export class RequestError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) { super(message); }
}
export async function readJson(request: Request, maxBytes = 16_384) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new RequestError("PAYLOAD_TOO_LARGE", "Request body is too large", 413);
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) throw new RequestError("PAYLOAD_TOO_LARGE", "Request body is too large", 413);
  try { return JSON.parse(text) as unknown; } catch { throw new RequestError("INVALID_JSON", "Request body must be valid JSON", 400); }
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const allowed = new Set([siteUrl(), new URL(request.url).origin]);
  if (!allowed.has(origin.replace(/\/$/, ""))) throw new RequestError("INVALID_ORIGIN", "Request origin is not allowed", 403);
}
export function assertStrictSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) throw new RequestError("INVALID_ORIGIN", "Request origin is required", 403);
  assertSameOrigin(request);
}
export function requestFingerprint(request: Request) {
  const forwarded = request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const agent = request.headers.get("user-agent") || "unknown";
  return createHash("sha256").update(`${rateLimitSalt()}:${forwarded}:${agent}`).digest("hex");
}
export function requestErrorResponse(error: unknown) {
  if (error instanceof RequestError) return apiError(error.code, error.message, error.status);
  return apiError("INTERNAL_ERROR", "The request could not be completed", 500);
}
