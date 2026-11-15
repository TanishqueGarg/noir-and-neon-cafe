import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { AdminLoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export default async function AdminLoginPage() {
  const auth = await getAdminSession().catch(() => null);
  if (auth) redirect("/admin");
  return <main className="grid min-h-screen place-items-center px-5 py-12"><div className="w-full max-w-md"><div className="mb-8 font-display text-3xl uppercase tracking-wide">NOIR <span className="text-lime-muted">&</span> NEON</div><AdminLoginForm/></div></main>;
}
