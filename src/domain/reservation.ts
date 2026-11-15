import type { AvailabilitySlot } from "@/types";

const KOLKATA_OFFSET = "+05:30";
export const localDateTimeToUtc = (date: string, time: string) => new Date(`${date}T${time}:00${KOLKATA_OFFSET}`);
export const minutesFromClock = (clock: string) => { const [hours, minutes] = clock.split(":").map(Number); return hours * 60 + minutes; };
export const clockFromMinutes = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

export function isValidLocalDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day;
}

export function generateSlots(openingHour: string, closingHour: string, durationMinutes: number, intervalMinutes = 30) {
  const first = minutesFromClock(openingHour);
  const last = minutesFromClock(closingHour) - durationMinutes;
  const slots: string[] = [];
  for (let value = first; value <= last; value += intervalMinutes) slots.push(clockFromMinutes(value));
  return slots;
}

export function assertBookableDate(date: string, time: string, cutoffMinutes: number, now = new Date()) {
  if (!isValidLocalDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("INVALID_DATE");
  const value = localDateTimeToUtc(date, time);
  if (Number.isNaN(value.getTime())) throw new Error("INVALID_DATE");
  if (value.getTime() < now.getTime() + cutoffMinutes * 60_000) throw new Error("BOOKING_CUTOFF");
  if (value.getTime() > now.getTime() + 90 * 86_400_000) throw new Error("DATE_TOO_FAR");
  return value;
}

export function availabilityForSlots(args: {
  date: string; slots: string[]; guests: number; capacity: number; durationMinutes: number;
  reservations: Array<{ reservationTime: Date; durationMinutes: number; guests: number }>;
  cutoffMinutes: number; now?: Date;
}): AvailabilitySlot[] {
  const now = args.now || new Date();
  return args.slots.map((time) => {
    const start = localDateTimeToUtc(args.date, time);
    const end = new Date(start.getTime() + args.durationMinutes * 60_000);
    const occupied = args.reservations.filter((reservation) => {
      const reservationEnd = new Date(reservation.reservationTime.getTime() + reservation.durationMinutes * 60_000);
      return reservation.reservationTime < end && reservationEnd > start;
    }).reduce((sum, reservation) => sum + reservation.guests, 0);
    const remainingSeats = Math.max(0, args.capacity - occupied);
    const pastCutoff = start.getTime() < now.getTime() + args.cutoffMinutes * 60_000;
    const status = pastCutoff || remainingSeats < args.guests ? "unavailable" : remainingSeats <= Math.max(args.guests, Math.ceil(args.capacity * 0.2)) ? "limited" : "available";
    return { time, status, remainingSeats };
  });
}
