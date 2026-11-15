export class SetupRequiredError extends Error {
  constructor(public readonly service: "database" | "email" | "auth") { super(`${service} configuration is required`); }
}
export function requireDatabaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value || /user:password|USER:PASSWORD|CHANGE_ME|<[^>]+>|@HOST(?=[:/])/i.test(value)) throw new SetupRequiredError("database");
  try {
    const parsed = new URL(value);
    if (!/^postgres(ql)?:$/.test(parsed.protocol) || !parsed.hostname || !parsed.pathname.slice(1)) throw new Error("invalid");
  } catch {
    throw new SetupRequiredError("database");
  }
  return value;
}
export function siteUrl() { return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""); }
export function rateLimitSalt() {
  const value = process.env.RATE_LIMIT_SALT;
  if (value && value.length >= 32 && !/replace|change|example/i.test(value)) return value;
  if (process.env.NODE_ENV === "production") throw new SetupRequiredError("auth");
  return "development-only-rate-limit-salt";
}
