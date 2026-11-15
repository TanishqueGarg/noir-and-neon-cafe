import "server-only";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";

export async function requireAdminPage() {
  const auth = await getAdminSession().catch(() => null);
  if (!auth) redirect("/admin/login");
  return auth;
}
