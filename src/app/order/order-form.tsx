"use client";

import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, CheckCircle2, Minus, Plus, ShoppingBag, Store } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/features/cart/store";
import { orderFormSchema, type OrderFormValues } from "@/lib/validation";
import { formatINR } from "@/lib/utils";
import { orderClient } from "@/services/client";
import type { OrderReceipt } from "@/types";

export function OrderForm() {
  const { items, updateQuantity, removeItem, clear } = useCartStore();
  const [step, setStep] = useState<"details" | "review" | "success">("details");
  const [serverError, setServerError] = useState("");
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const idempotencyKey = useRef(crypto.randomUUID());
  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues } = useForm<OrderFormValues>({ resolver: zodResolver(orderFormSchema), defaultValues: { pickupTime: "ASAP", notes: "" } });
  const subtotal = items.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);

  const submit = async (values: OrderFormValues) => {
    setServerError("");
    const response = await orderClient.create({ ...values, items: items.map((entry) => ({ menuItemId: entry.item.id, quantity: entry.quantity })) }, idempotencyKey.current);
    if (response.ok && response.data) { setReceipt(response.data); clear(); setStep("success"); }
    else setServerError(response.error?.message || "We could not place the order.");
  };

  if (step === "success" && receipt) return <div className="mx-auto grid min-h-[65vh] max-w-3xl place-items-center"><div className="panel-elevated w-full border-l-2 border-lime-muted p-8 text-center sm:p-12"><CheckCircle2 className="mx-auto size-12 text-lime-muted"/><p className="eyebrow mt-6">Order persisted</p><h1 className="mt-3 font-display text-6xl uppercase sm:text-7xl">We have your order.</h1><p className="mt-5 text-sm text-muted">Reference <strong className="text-text">{receipt.reference}</strong> · Total {formatINR(receipt.total)}</p><p className="mt-3 text-xs text-muted">{receipt.emailAccepted ? "The email provider accepted at least one acknowledgement." : "The order is saved, but email delivery is pending or unavailable. Keep the reference above."}</p><Button href="/" className="mt-8">Back home</Button></div></div>;
  if (!items.length) return <div className="grid min-h-[70vh] place-items-center text-center"><div><ShoppingBag className="mx-auto size-12 text-lime-muted"/><h1 className="mt-5 font-display text-7xl uppercase">Your order is empty.</h1><p className="mt-3 text-muted">The menu is the right place to fix that.</p><Button href="/menu" className="mt-8">Browse the menu</Button></div></div>;

  return <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
    <section className="panel p-5 sm:p-8">
      <div className="mb-8 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest"><span className={`rounded-full px-3 py-2 ${step === "details" ? "bg-lime-muted text-ink" : "bg-elevated text-muted"}`}>01 Details</span><span className="h-px w-8 bg-line"/><span className={`rounded-full px-3 py-2 ${step === "review" ? "bg-lime-muted text-ink" : "bg-elevated text-muted"}`}>02 Review</span></div>
      {step === "details" ? <form onSubmit={handleSubmit(() => setStep("review"))}>
        <div className="mb-7 flex items-center gap-3 border border-blue/30 bg-navy/25 p-4"><Store className="size-5 text-blue"/><div><p className="text-sm font-bold">Pickup at NOIR & NEON</p><p className="mt-1 text-xs text-muted">Authentic pickup address is configured before launch.</p></div></div>
        <div className="grid gap-5 sm:grid-cols-2"><Field label="Your name" error={errors.customerName?.message}><input className="field" {...register("customerName")} autoComplete="name"/></Field><Field label="Mobile number" error={errors.mobile?.message}><input className="field" {...register("mobile")} inputMode="tel" autoComplete="tel" placeholder="10-digit number"/></Field><Field label="Email" error={errors.email?.message}><input className="field" {...register("email")} type="email" autoComplete="email"/></Field><Field label="Pickup preference" error={errors.pickupTime?.message}><select className="field" {...register("pickupTime")}><option value="ASAP">ASAP (configured lead time)</option><option value="45">In 45 minutes</option><option value="60">In 60 minutes</option><option value="90">In 90 minutes</option></select></Field><Field label="Order notes" error={errors.notes?.message} className="sm:col-span-2"><textarea className="field min-h-28 resize-none" {...register("notes")} placeholder="Allergies, cutlery, or pickup notes"/></Field></div>
        <Button className="mt-8 w-full sm:w-auto" type="submit">Review order</Button>
      </form> : <div>
        <button onClick={() => setStep("details")} className="mb-7 inline-flex items-center gap-2 text-xs font-bold text-lime-muted"><ArrowLeft className="size-4"/>Edit details</button>
        <div className="space-y-6"><ReviewLine label="Name" value={getValues("customerName")}/><ReviewLine label="Mobile" value={getValues("mobile")}/><ReviewLine label="Email" value={getValues("email")}/><ReviewLine label="Pickup" value={getValues("pickupTime")}/>{getValues("notes")&&<ReviewLine label="Notes" value={getValues("notes") || ""}/>}</div>
        <div className="mt-8 border border-lime-muted/30 bg-lime-muted/5 p-4 text-sm leading-6 text-white/75"><strong className="text-lime-muted">Pay at counter.</strong> Prices are recalculated from the database before saving. No payment details are collected online.</div>
        {serverError&&<div role="alert" className="mt-5 flex gap-3 border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100"><AlertCircle className="mt-1 size-5 shrink-0"/>{serverError}</div>}
        <Button className="mt-7 w-full" disabled={isSubmitting} onClick={handleSubmit(submit)}>{isSubmitting ? "Saving order..." : "Submit pickup order"}</Button>
      </div>}
    </section>
    <aside className="panel-elevated h-fit p-5 sm:p-7 lg:sticky lg:top-28"><h2 className="font-display text-4xl uppercase">Order summary</h2><div className="mt-5 max-h-[440px] space-y-4 overflow-y-auto">{items.map(({item,quantity})=><div key={item.id} className="grid grid-cols-[64px_1fr] gap-3 border-b border-line pb-4"><div className="relative aspect-square overflow-hidden"><Image src={item.image} alt="" fill sizes="64px" className="object-cover"/></div><div><div className="flex justify-between gap-2"><p className="text-sm font-bold">{item.name}</p><p className="text-sm font-bold">{formatINR(item.price * quantity)}</p></div><div className="mt-2 flex items-center gap-2"><button className="grid size-8 place-items-center rounded-full border border-line" onClick={()=>updateQuantity(item.id,quantity-1)} aria-label={`Decrease ${item.name}`}><Minus className="size-3"/></button><span className="w-4 text-center text-xs">{quantity}</span><button className="grid size-8 place-items-center rounded-full border border-line" onClick={()=>updateQuantity(item.id,quantity+1)} aria-label={`Increase ${item.name}`}><Plus className="size-3"/></button><button onClick={()=>removeItem(item.id)} className="ml-2 text-[10px] text-muted underline">Remove</button></div></div></div>)}</div><div className="mt-6 space-y-3 border-t border-line pt-5 text-sm"><div className="flex justify-between text-muted"><span>Displayed subtotal</span><span>{formatINR(subtotal)}</span></div><div className="flex justify-between text-muted"><span>Taxes</span><span>Included</span></div><div className="flex justify-between pt-2 font-bold"><span>Estimated total</span><span className="font-display text-3xl">{formatINR(subtotal)}</span></div></div><p className="mt-6 border-l border-blue pl-3 text-[10px] leading-5 text-muted">The final total is recalculated from active database records before the order is saved.</p></aside>
  </div>;
}

function Field({label,error,children,className=""}:{label:string;error?:string;children:React.ReactNode;className?:string}) { return <label className={className}><span className="field-label">{label}</span>{children}{error&&<span className="field-error">{error}</span>}</label>; }
function ReviewLine({label,value}:{label:string;value:string}) { return <div className="flex justify-between gap-8 border-b border-line pb-4"><span className="text-xs uppercase tracking-widest text-muted">{label}</span><span className="text-right text-sm font-bold">{value}</span></div>; }
