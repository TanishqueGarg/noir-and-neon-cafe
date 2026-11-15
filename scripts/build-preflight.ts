import { loadEnvConfig } from "@next/env";
import { checkProductionEnvironment } from "../src/lib/production-env";

const enforced = process.env.VERCEL_ENV === "production" || process.env.ENFORCE_PRODUCTION_ENV === "true";
if (!enforced) {
  console.info("Production environment preflight skipped for this non-production build.");
} else {
  loadEnvConfig(process.cwd());
  const report = checkProductionEnvironment(process.env);
  for (const warning of report.warnings) console.warn(`WARN  ${warning}`);
  for (const error of report.errors) console.error(`ERROR ${error}`);
  if (report.errors.length) throw new Error(`Production environment preflight failed with ${report.errors.length} error(s).`);
  console.info("Production environment preflight passed. No external connection was attempted.");
}
