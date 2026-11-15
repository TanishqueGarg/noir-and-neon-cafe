import bcrypt from "bcryptjs";
import { adminLoginSchema } from "../src/lib/validation";
import { db } from "../src/lib/db";
import { requireDatabaseUrl } from "../src/lib/env";

async function main() {
  requireDatabaseUrl();
  const input = adminLoginSchema.parse({ email: process.env.ADMIN_BOOTSTRAP_EMAIL, password: process.env.ADMIN_BOOTSTRAP_PASSWORD });
  if (input.password.length < 16) throw new Error("ADMIN_BOOTSTRAP_PASSWORD must contain at least 16 characters");
  const existing = await db.adminUser.findUnique({ where: { email: input.email } });
  if (existing) throw new Error("An admin with this email already exists. Bootstrap will not overwrite credentials.");
  const passwordHash = await bcrypt.hash(input.password, 12);
  await db.adminUser.create({ data: { email: input.email, passwordHash, role: "OWNER" } });
  console.info("Initial owner account created. Remove bootstrap credentials from the environment now.");
}

main().finally(async () => db.$disconnect());
