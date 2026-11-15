"use client";

import { Plus } from "lucide-react";
import type { MenuItem } from "@/types";
import { useCartStore } from "@/features/cart/store";
import { useToast } from "@/components/ui/toast";

export function AddToCartButton({ item, quantity = 1, compact = false }: { item: MenuItem; quantity?: number; compact?: boolean }) {
  const addItem = useCartStore((state) => state.addItem);
  const toast = useToast();
  return <button disabled={item.available === false} onClick={(event)=>{event.preventDefault();if(item.available===false)return;addItem(item,quantity);toast(`${quantity} × ${item.name} added`);}} className={`${compact?"ml-auto mt-3 grid size-11 place-items-center rounded-full border border-lime-muted/50 bg-lime-muted text-ink":"inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-lime-muted px-6 text-xs font-extrabold uppercase tracking-[.15em] text-ink"} transition hover:border-lime hover:bg-lime disabled:cursor-not-allowed disabled:border-line disabled:bg-elevated disabled:text-muted`} aria-label={item.available===false?`${item.name} is unavailable`:`Add ${item.name} to cart`}><Plus className="size-4"/>{!compact&&(item.available===false?"Unavailable":"Add to order")}</button>;
}
