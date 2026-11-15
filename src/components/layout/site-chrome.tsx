"use client";
import { usePathname } from "next/navigation";

export function SiteChrome({ children, navbar, footer }: { children: React.ReactNode; navbar: React.ReactNode; footer: React.ReactNode }) {
  const admin = usePathname().startsWith("/admin");
  if (admin) return <main>{children}</main>;
  return <>{navbar}<main>{children}</main>{footer}</>;
}
