import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { LogoutButton } from "@/components/admin/admin-client";

const links = [["/admin","Overview"],["/admin/orders","Orders"],["/admin/reservations","Reservations"],["/admin/menu","Menu"],["/admin/contact","Contact"],["/admin/newsletter","Newsletter"]];
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAdminSession().catch(() => null);
  if (!auth) redirect("/admin/login");
  const availableLinks = auth.admin.role === "OWNER" ? [...links, ["/admin/settings", "Business"]] : links;
  return <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]"><aside className="border-b border-line bg-surface p-5 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r"><Link href="/admin" className="font-display text-3xl uppercase">NOIR <span className="text-lime-muted">&</span> NEON</Link><p className="mt-2 text-[10px] uppercase tracking-widest text-muted">Operations console</p><nav className="mt-8 flex gap-2 overflow-x-auto lg:block lg:space-y-1">{availableLinks.map(([href,label])=><Link className="block shrink-0 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-elevated hover:text-text" key={href} href={href}>{label}</Link>)}</nav><div className="mt-8 border-t border-line pt-5"><p className="mb-3 truncate text-xs text-muted">{auth.admin.email} · {auth.admin.role.toLowerCase()}</p><LogoutButton/></div></aside><main className="min-w-0 p-5 sm:p-8 lg:p-10">{children}</main></div>;
}
