"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, ShoppingBag, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCartStore } from "@/features/cart/store";
import { totalItems } from "@/lib/utils";

const links = [{ href: "/menu", label: "Menu" },{ href: "/gallery", label: "Gallery" },{ href: "/about", label: "Our Story" },{ href: "/reservations", label: "Reservations" },{ href: "/order", label: "Order" }];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { items, setDrawerOpen, setHasHydrated } = useCartStore();
  useEffect(() => useCartStore.persist.onFinishHydration(() => setHasHydrated(true)), [setHasHydrated]);
  useEffect(() => setOpen(false), [pathname]);
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-5 lg:px-10" aria-label="Primary navigation">
        <Link href="/" className="font-display text-2xl tracking-wide"><span>NOIR</span><span className="text-lime">&</span><span>NEON</span></Link>
        <div className="hidden items-center gap-8 md:flex">{links.map((link) => <Link key={link.href} href={link.href} className={`text-xs font-bold uppercase tracking-[0.16em] transition-colors hover:text-lime ${pathname === link.href ? "text-lime" : "text-white/75"}`}>{link.label}</Link>)}</div>
        <div className="flex items-center gap-2"><button className="relative grid size-11 place-items-center rounded-full border border-white/15 transition hover:border-lime hover:text-lime" onClick={() => setDrawerOpen(true)} aria-label={`Open cart with ${totalItems(items)} items`}><ShoppingBag className="size-4" />{items.length > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-lime text-[10px] font-black text-ink">{totalItems(items)}</span>}</button><button className="grid size-11 place-items-center rounded-full border border-white/15 md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle menu">{open ? <X className="size-5" /> : <Menu className="size-5" />}</button></div>
      </nav>
      <AnimatePresence>{open && <motion.div className="border-t border-white/10 bg-ink px-5 py-5 md:hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>{links.map((link, index) => <motion.div key={link.href} initial={{ x: -12, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: index * .05 }}><Link href={link.href} className="block border-b border-white/10 py-5 font-display text-4xl uppercase">{link.label}</Link></motion.div>)}</motion.div>}</AnimatePresence>
    </header>
  );
}
