"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Minus,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  reservationFormSchema,
  type ReservationFormValues,
} from "@/lib/validation";
import { reservationClient } from "@/services/client";
import type { AvailabilitySlot, ReservationReceipt } from "@/types";

type AvailabilityState =
  | { status: "idle" | "loading"; slots: AvailabilitySlot[]; message: string }
  | { status: "ready"; slots: AvailabilitySlot[]; message: string }
  | { status: "error" | "setup"; slots: AvailabilitySlot[]; message: string };

function tomorrowInKolkata() {
  const date = new Date(Date.now() + 86_400_000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function ReservationForm() {
  const [availability, setAvailability] = useState<AvailabilityState>({
    status: "idle",
    slots: [],
    message: "Choose a date to check live table availability.",
  });
  const [serverError, setServerError] = useState("");
  const [receipt, setReceipt] = useState<ReservationReceipt | null>(null);
  const idempotencyKey = useRef(crypto.randomUUID());
  const minDate = useMemo(tomorrowInKolkata, []);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: { guests: 2, time: "", requests: "" },
  });
  const guests = watch("guests");
  const time = watch("time");
  const date = watch("date");

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
      setAvailability({
        status: "idle",
        slots: [],
        message: "Choose a date to check live table availability.",
      });
      return;
    }
    setValue("time", "", { shouldValidate: false });
    setAvailability({
      status: "loading",
      slots: [],
      message: "Checking live availability…",
    });
    let active = true;
    const timer = window.setTimeout(async () => {
      const response = await reservationClient.availability(date, guests);
      if (!active) return;
      if (response.ok && response.data) {
        setAvailability({
          status: "ready",
          slots: response.data,
          message: response.data.some((slot) => slot.status !== "unavailable")
            ? "Availability is live. Limited slots have fewer remaining seats."
            : "No tables fit this party on the selected date.",
        });
        return;
      }
      setAvailability({
        status: response.error?.code === "SETUP_REQUIRED" ? "setup" : "error",
        slots: [],
        message:
          response.error?.message ||
          "Availability could not be loaded. Please try again.",
      });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [date, guests, setValue]);

  const submit = async (values: ReservationFormValues) => {
    setServerError("");
    const response = await reservationClient.create(values, idempotencyKey.current);
    if (response.ok && response.data) {
      setReceipt(response.data);
      return;
    }
    setServerError(
      response.error?.message || "We could not save this table request.",
    );
  };

  if (receipt) {
    const confirmed = receipt.status === "CONFIRMED";
    return (
      <div className="panel-elevated grid min-h-[580px] place-items-center border-l-2 border-lime-muted p-7 text-center sm:p-10">
        <div className="max-w-xl">
          <CheckCircle2 className="mx-auto size-12 text-lime-muted" />
          <p className="eyebrow mt-6">
            {confirmed ? "Reservation confirmed" : "Request saved"}
          </p>
          <h2 className="mt-3 font-display text-6xl uppercase leading-[.9] sm:text-7xl">
            {confirmed ? "Your table is ready." : "The team will review it."}
          </h2>
          <p className="mt-5 text-sm leading-7 text-muted">
            Reference <strong className="text-text">{receipt.reference}</strong> ·{" "}
            {receipt.date} at {receipt.time}. Status: {receipt.status.toLowerCase()}.
          </p>
          <p className="mt-3 text-xs leading-6 text-muted">
            {receipt.emailAccepted
              ? "The email provider accepted the acknowledgement."
              : "Email delivery is pending or unavailable; keep the reference above."}
          </p>
          <Button href="/" className="mt-8">
            Back home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="panel rounded-[1.5rem] p-5 sm:p-8"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Your name" error={errors.name?.message}>
          <input className="field" autoComplete="name" {...register("name")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input
            className="field"
            type="email"
            autoComplete="email"
            {...register("email")}
          />
        </Field>
        <Field label="Mobile number" error={errors.mobile?.message}>
          <input
            className="field"
            inputMode="tel"
            autoComplete="tel"
            placeholder="10-digit mobile"
            {...register("mobile")}
          />
        </Field>
        <Field label="Reservation date" error={errors.date?.message}>
          <input
            className="field"
            type="date"
            min={minDate}
            {...register("date")}
          />
        </Field>
      </div>

      <div className="mt-8">
        <p className="field-label">Number of guests</p>
        <div className="inline-flex h-14 items-center rounded-full border border-line bg-ink/40">
          <button
            type="button"
            className="grid size-12 place-items-center rounded-full transition hover:bg-elevated hover:text-lime-muted disabled:opacity-35"
            onClick={() =>
              setValue("guests", Math.max(1, guests - 1), {
                shouldValidate: true,
              })
            }
            disabled={guests <= 1}
            aria-label="Decrease guests"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-24 text-center text-sm font-bold" aria-live="polite">
            {guests} {guests === 1 ? "guest" : "guests"}
          </span>
          <button
            type="button"
            className="grid size-12 place-items-center rounded-full transition hover:bg-elevated hover:text-lime-muted disabled:opacity-35"
            onClick={() =>
              setValue("guests", Math.min(10, guests + 1), {
                shouldValidate: true,
              })
            }
            disabled={guests >= 10}
            aria-label="Increase guests"
          >
            <Plus className="size-4" />
          </button>
        </div>
        {errors.guests && <p className="field-error">{errors.guests.message}</p>}
      </div>

      <fieldset className="mt-8">
        <legend className="field-label">Choose a time</legend>
        <div
          className={`mb-4 flex items-start gap-3 border p-4 text-xs leading-5 ${
            availability.status === "setup" || availability.status === "error"
              ? "border-amber-300/25 bg-amber-300/5 text-amber-100"
              : "border-line bg-ink/35 text-muted"
          }`}
          role="status"
          aria-live="polite"
        >
          {availability.status === "loading" ? (
            <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" />
          ) : availability.status === "setup" || availability.status === "error" ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          ) : (
            <Clock3 className="mt-0.5 size-4 shrink-0 text-lime-muted" />
          )}
          <span>{availability.message}</span>
        </div>
        {availability.slots.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
            {availability.slots.map((slot) => {
              const unavailable = slot.status === "unavailable";
              const selected = time === slot.time;
              return (
                <button
                  key={slot.time}
                  type="button"
                  disabled={unavailable}
                  onClick={() =>
                    setValue("time", slot.time, { shouldValidate: true })
                  }
                  className={`min-h-14 border text-sm font-bold transition ${
                    selected
                      ? "border-lime-muted bg-lime-muted text-ink"
                      : unavailable
                        ? "cursor-not-allowed border-line bg-ink/20 text-muted/35 line-through"
                        : slot.status === "limited"
                          ? "border-amber-200/35 bg-amber-200/5 text-amber-100 hover:border-amber-200"
                          : "border-line bg-ink/30 text-text hover:border-lime-muted/60 hover:bg-elevated"
                  }`}
                  aria-pressed={selected}
                  aria-label={`${slot.time}, ${slot.status}`}
                >
                  {slot.time}
                  {slot.status === "limited" && (
                    <span className="mt-1 block text-[8px] uppercase tracking-wider">
                      Limited
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {errors.time && <p className="field-error">{errors.time.message}</p>}
      </fieldset>

      <Field
        label="Special requests"
        error={errors.requests?.message}
        className="mt-8 block"
      >
        <textarea
          className="field min-h-28 resize-none"
          placeholder="Accessibility, celebration, or seating requests"
          {...register("requests")}
        />
      </Field>
      {serverError && (
        <div
          role="alert"
          className="mt-6 flex gap-3 border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100"
        >
          <AlertCircle className="mt-1 size-5 shrink-0" />
          {serverError}
        </div>
      )}
      <Button
        type="submit"
        className="mt-7 w-full"
        disabled={isSubmitting || availability.status !== "ready" || !time}
      >
        {isSubmitting ? "Saving request…" : "Request a table"}
      </Button>
      <p className="mt-4 text-center text-[10px] leading-5 text-muted">
        A request is only confirmed when the saved status is CONFIRMED. If live
        services are not configured, nothing is submitted.
      </p>
    </form>
  );
}

function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="field-error block">{error}</span>}
    </label>
  );
}
