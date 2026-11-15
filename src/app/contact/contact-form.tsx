"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { contactSchema } from "@/lib/validation";

type Values = z.infer<typeof contactSchema>;
export function ContactForm() {
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(contactSchema) });
  const submit = async (values: Values) => {
    setState(null);
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const result = await response.json();
      if (result.ok) { setState({ ok: true, message: result.data.emailAccepted ? "Your message was saved and the café was notified." : "Your message was saved. Email notification is pending configuration." }); reset(); }
      else setState({ ok: false, message: result.error?.message || "Your message could not be saved." });
    } catch { setState({ ok: false, message: "Could not reach the server. Please try again." }); }
  };
  return <form onSubmit={handleSubmit(submit)} className="panel p-5 sm:p-8">
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Name" error={errors.name?.message}><input className="field" autoComplete="name" {...register("name")}/></Field><Field label="Email" error={errors.email?.message}><input className="field" type="email" autoComplete="email" {...register("email")}/></Field></div>
    <Field label="Subject" error={errors.subject?.message} className="mt-5 block"><input className="field" {...register("subject")}/></Field>
    <Field label="Message" error={errors.message?.message} className="mt-5 block"><textarea className="field min-h-44 resize-y" {...register("message")}/></Field>
    {state && <div role="status" className={`mt-5 flex gap-3 border p-4 text-sm ${state.ok ? "border-lime-muted/30 bg-lime-muted/5 text-text" : "border-red-400/30 bg-red-400/10 text-red-100"}`}>{state.ok?<CheckCircle2 className="size-5 shrink-0 text-lime-muted"/>:<AlertCircle className="size-5 shrink-0"/>}{state.message}</div>}
    <Button type="submit" className="mt-7 w-full sm:w-auto" disabled={isSubmitting}>{isSubmitting ? "Saving message..." : "Send message"}</Button>
  </form>;
}
function Field({ label, error, children, className = "" }: { label: string; error?: string; children: React.ReactNode; className?: string }) { return <label className={className}><span className="field-label">{label}</span>{children}{error&&<span className="field-error">{error}</span>}</label>; }
