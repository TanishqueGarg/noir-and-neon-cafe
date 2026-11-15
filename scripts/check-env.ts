import { checkProductionEnvironment } from "../src/lib/production-env";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
const report = checkProductionEnvironment(process.env);
for (const warning of report.warnings) console.warn(`WARN  ${warning}`);
for (const error of report.errors) console.error(`ERROR ${error}`);
if (report.errors.length) {
  console.error(`\nProduction environment check failed with ${report.errors.length} error(s). No secret values were printed.`);
  process.exitCode = 1;
} else {
  console.info("Production environment check passed. No external connection was attempted.");
}
