"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useEffect } from "react";
import { useCartStore } from "@/features/cart/store";
import { formatINR } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function CartDrawer() {
  const { items, drawerOpen, setDrawerOpen, updateQuantity, removeItem } = useCartStore();
  const total = items.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [setDrawerOpen]);
  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.button aria-label="Close cart" className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} />
          <motion.aside role="dialog" aria-modal="true" aria-labelledby="cart-title" className="fixed right-0 top-0 z-[70] flex h-dvh w-full max-w-md flex-col border-l border-white/10 bg-ink p-5 sm:p-7" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 300 }}>
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div><p className="eyebrow">Pay at counter</p><h2 id="cart-title" className="font-display text-4xl uppercase">Your order</h2></div>
              <button className="grid size-11 place-items-center rounded-full border border-white/15 hover:border-lime hover:text-lime" onClick={() => setDrawerOpen(false)} aria-label="Close cart"><X /></button>
            </div>
            {items.length === 0 ? (
              <div className="grid flex-1 place-items-center text-center"><div><ShoppingBag className="mx-auto mb-4 size-10 text-lime" /><h3 className="text-xl font-bold">Your bag is quiet.</h3><p className="mt-2 text-sm text-muted">Add something worth staying up for.</p><Button href="/menu" className="mt-6" onClick={() => setDrawerOpen(false)}>Explore menu</Button></div></div>
            ) : (
              <div className="flex-1 overflow-y-auto py-3">
                {items.map(({ item, quantity }) => (
                  <div key={item.id} className="grid grid-cols-[76px_1fr] gap-4 border-b border-white/10 py-5">
                    <div className="relative aspect-square overflow-hidden rounded-xl"><Image src={item.image} alt="" fill sizes="76px" className="object-cover" /></div>
                    <div><div className="flex justify-between gap-3"><h3 className="font-bold">{item.name}</h3><span className="text-sm">{formatINR(item.price * quantity)}</span></div><p className="mt-1 text-xs text-muted">{item.category}</p><div className="mt-4 flex items-center justify-between"><div className="flex items-center rounded-full border border-white/15"><button onClick={() => updateQuantity(item.id, quantity - 1)} className="grid size-8 place-items-center" aria-label={`Decrease ${item.name}`}><Minus className="size-3" /></button><span className="w-7 text-center text-sm">{quantity}</span><button onClick={() => updateQuantity(item.id, quantity + 1)} className="grid size-8 place-items-center" aria-label={`Increase ${item.name}`}><Plus className="size-3" /></button></div><button className="text-xs text-muted underline hover:text-white" onClick={() => removeItem(item.id)}>Remove</button></div></div>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-white/10 pt-5"><div className="mb-4 flex items-end justify-between"><span className="text-sm text-muted">Subtotal</span><strong className="font-display text-3xl">{formatINR(total)}</strong></div><Button href="/order" className="w-full" onClick={() => setDrawerOpen(false)} disabled={!items.length}>Continue to pickup</Button><p className="mt-3 text-center text-[11px] text-muted">Taxes included · Payment at the café counter</p></div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
