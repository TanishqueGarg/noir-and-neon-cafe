"use client";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import type { MenuItem } from "@/types";
import { AddToCartButton } from "@/components/menu/add-to-cart-button";
export function ProductActions({item}:{item:MenuItem}){const [quantity,setQuantity]=useState(1);return <div className="mt-8 flex flex-wrap gap-3"><div className="flex h-12 items-center rounded-full border border-white/15"><button className="grid size-11 place-items-center" onClick={()=>setQuantity(q=>Math.max(1,q-1))} aria-label="Decrease quantity"><Minus className="size-4"/></button><span className="w-8 text-center text-sm font-bold" aria-live="polite">{quantity}</span><button className="grid size-11 place-items-center" onClick={()=>setQuantity(q=>Math.min(10,q+1))} aria-label="Increase quantity"><Plus className="size-4"/></button></div><AddToCartButton item={item} quantity={quantity}/></div>}
