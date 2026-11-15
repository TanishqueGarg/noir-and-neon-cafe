type Environment = Record<string, string | undefined>;

export type EnvironmentReport = { errors: string[]; warnings: string[] };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const placeholderEmail = /@(?:example\.(?:com|org|net)|[^@]+\.(?:example|test)|localhost)$/i;
const operationalEmail = (value: string | undefined) => Boolean(value && emailPattern.test(value) && !placeholderEmail.test(value));

function postgresUrl(name: string, value: string | undefined, errors: string[]) {
  if (!value) {
    errors.push(`${name} is required.`);
    return null;
  }
  try {
    const url = new URL(value);
    if (!/^postgres(ql)?:$/.test(url.protocol) || !url.hostname || !url.pathname.slice(1)) throw new Error("invalid");
    if (url.searchParams.get("sslmode") !== "require") errors.push(`${name} must enforce TLS with sslmode=require.`);
    return url;
  } catch {
    errors.push(`${name} must be a valid PostgreSQL connection URL.`);
    return null;
  }
}

function requiredSecret(name: string, value: string | undefined, errors: string[]) {
  if (!value || value.length < 32 || /replace|change|example/i.test(value)) errors.push(`${name} must be an independent random secret of at least 32 characters.`);
}

export function checkProductionEnvironment(env: Environment): EnvironmentReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const runtime = postgresUrl("DATABASE_URL", env.DATABASE_URL, errors);
  const direct = postgresUrl("DIRECT_URL", env.DIRECT_URL, errors);
  if (runtime && direct && runtime.toString() === direct.toString()) warnings.push("DATABASE_URL and DIRECT_URL are identical; use a pooled runtime URL and direct migration URL for serverless hosting.");
  if (direct && (direct.hostname.includes("-pooler") || direct.searchParams.get("pgbouncer") === "true")) errors.push("DIRECT_URL must not use a pooled/PgBouncer endpoint.");
  if (runtime && !runtime.hostname.includes("-pooler") && runtime.searchParams.get("pgbouncer") !== "true") warnings.push("DATABASE_URL does not look pooled; confirm the provider connection limit is safe for serverless concurrency.");

  const site = env.NEXT_PUBLIC_SITE_URL;
  try {
    const url = new URL(site || "");
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("invalid");
  } catch {
    errors.push("NEXT_PUBLIC_SITE_URL must be the canonical HTTPS origin with no path, query, or credentials.");
  }

  if (!env.RESEND_API_KEY?.startsWith("re_") || env.RESEND_API_KEY.length < 20 || /^re_x{5,}$/i.test(env.RESEND_API_KEY)) errors.push("RESEND_API_KEY is required for live transactional email.");
  const fromAddress = env.EMAIL_FROM?.match(/<([^>]+)>$/)?.[1] || env.EMAIL_FROM;
  if (!operationalEmail(fromAddress)) errors.push("EMAIL_FROM must contain a valid non-placeholder verified sender address.");
  if (!operationalEmail(env.ADMIN_NOTIFICATION_EMAIL)) errors.push("ADMIN_NOTIFICATION_EMAIL must be a valid non-placeholder address.");
  requiredSecret("RATE_LIMIT_SALT", env.RATE_LIMIT_SALT, errors);
  requiredSecret("CRON_SECRET", env.CRON_SECRET, errors);

  const sessionHours = Number(env.ADMIN_SESSION_HOURS || "8");
  if (!Number.isInteger(sessionHours) || sessionHours < 1 || sessionHours > 24) errors.push("ADMIN_SESSION_HOURS must be an integer from 1 to 24.");
  if (env.ALLOW_DEVELOPMENT_SEED === "true") errors.push("ALLOW_DEVELOPMENT_SEED must not be enabled in a production environment.");
  if (env.ALLOW_DATABASE_TESTS === "true") errors.push("ALLOW_DATABASE_TESTS must not be enabled in a production environment.");
  if (Boolean(env.ADMIN_BOOTSTRAP_EMAIL) !== Boolean(env.ADMIN_BOOTSTRAP_PASSWORD)) errors.push("ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must either both be set or both be absent.");
  else if (env.ADMIN_BOOTSTRAP_EMAIL) {
    if (!operationalEmail(env.ADMIN_BOOTSTRAP_EMAIL) || !env.ADMIN_BOOTSTRAP_PASSWORD || env.ADMIN_BOOTSTRAP_PASSWORD.length < 16 || /replace|change|example|set-only/i.test(env.ADMIN_BOOTSTRAP_PASSWORD)) errors.push("ADMIN_BOOTSTRAP_* values must be non-placeholder and the password must contain at least 16 characters.");
    else warnings.push("Remove one-time ADMIN_BOOTSTRAP_* values after the owner account has been created.");
  }
  const emailTimeout = Number(env.EMAIL_SEND_TIMEOUT_MS || "8000");
  if (!Number.isInteger(emailTimeout) || emailTimeout < 1_000 || emailTimeout > 15_000) errors.push("EMAIL_SEND_TIMEOUT_MS must be an integer from 1000 to 15000.");
  if (env.TEST_DATABASE_URL && env.TEST_DATABASE_URL === env.DATABASE_URL) errors.push("TEST_DATABASE_URL must never equal DATABASE_URL.");
  return { errors, warnings };
}
