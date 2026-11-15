"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return <form className="panel-elevated w-full max-w-md p-7 sm:p-9" onSubmit={async (event) => {
    event.preventDefault(); setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
      const result = await response.json();
      if (!result.ok) setError(result.error?.message || "Login failed"); else { router.replace("/admin"); router.refresh(); }
    } catch { setError("Could not reach the server"); } finally { setPending(false); }
  }}>
    <p className="eyebrow">Protected operations</p><h1 className="mt-4 font-display text-6xl uppercase">Admin access</h1><p className="mt-3 text-sm leading-6 text-muted">No public registration. Use an account created through the secure bootstrap command.</p>
    <label className="mt-8 block"><span className="field-label">Email</span><input className="field" name="email" type="email" autoComplete="username" required /></label>
    <label className="mt-5 block"><span className="field-label">Password</span><input className="field" name="password" type="password" autoComplete="current-password" minLength={12} required /></label>
    {error && <p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}
    <button disabled={pending} className="mt-7 min-h-12 w-full rounded-full bg-lime-muted px-5 text-xs font-extrabold uppercase tracking-widest text-ink disabled:opacity-50">{pending ? "Checking…" : "Sign in"}</button>
  </form>;
}
