import type { Metadata } from "next";
import { Bebas_Neue, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";
import { SiteChrome } from "@/components/layout/site-chrome";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

const display = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "NOIR & NEON — Brewed After Dark", template: "%s — NOIR & NEON" },
  description: "Specialty coffee, ambitious plates and after-dark café culture in Bengaluru.",
  openGraph: { title: "NOIR & NEON", description: "Brewed After Dark.", type: "website", images: ["/images/hero-night-cafe.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${display.variable} ${body.variable}`}><body className="font-sans antialiased"><Providers><SiteChrome navbar={<Navbar />} footer={<Footer />}>{children}</SiteChrome></Providers></body></html>;
}
