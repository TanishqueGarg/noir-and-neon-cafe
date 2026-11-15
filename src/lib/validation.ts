import { z } from "zod";

const cleanText = (min: number, max: number, label: string) => z.string().trim().min(min, `${label} is required`).max(max, `${label} is too long`);
const mobile = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");
const email = z.string().trim().toLowerCase().email("Enter a valid email").max(254);
const idempotencyKey = z.string().uuid("A valid idempotency key is required");
const menuCategory = z.enum(["Signature Coffee", "Cold Brews", "Matcha & Specialty Drinks", "Breakfast", "Sandwiches & Savory", "Desserts", "Seasonal Specials"]);
const localMenuImage = z.union([z.literal(""), z.string().trim().regex(/^\/images\/[a-zA-Z0-9/_-]+\.(?:avif|webp|png|jpe?g)$/i, "Use an image stored under /public/images")]).transform((value) => value || null);

export const orderFormSchema = z.object({
  customerName: cleanText(2, 80, "Name"), mobile, email,
  pickupTime: z.enum(["ASAP", "45", "60", "90"]),
  notes: z.string().trim().max(300).optional().default(""),
});
export const orderRequestSchema = orderFormSchema.extend({
  idempotencyKey,
  items: z.array(z.object({ menuItemId: z.string().trim().min(1).max(80), quantity: z.number().int().min(1).max(10) })).min(1).max(30).superRefine((items, context) => {
    if (items.reduce((sum, item) => sum + item.quantity, 0) > 40) context.addIssue({ code: "custom", message: "An order may contain at most 40 items" });
    if (new Set(items.map((item) => item.menuItemId)).size !== items.length) context.addIssue({ code: "custom", message: "Duplicate menu rows are not allowed" });
  }),
});
export const reservationFormSchema = z.object({
  name: cleanText(2, 80, "Name"), email, mobile,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a valid time"),
  guests: z.number().int().min(1).max(10),
  requests: z.string().trim().max(400).optional().default(""),
});
export const reservationRequestSchema = reservationFormSchema.extend({ idempotencyKey });
export const availabilityQuerySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), guests: z.coerce.number().int().min(1).max(10) });
export const contactSchema = z.object({ name: cleanText(2, 80, "Name"), email, subject: cleanText(3, 120, "Subject"), message: cleanText(10, 2000, "Message") });
export const newsletterSchema = z.object({ email });
export const adminLoginSchema = z.object({ email, password: z.string().min(12).max(128) });
export const orderStatusSchema = z.enum(["ACCEPTED", "REJECTED", "READY", "COMPLETED", "CANCELLED"]);
export const reservationStatusSchema = z.enum(["CONFIRMED", "REJECTED", "CANCELLED"]);
export const menuAdminSchema = z.object({
  name: cleanText(2, 100, "Name").optional(), description: cleanText(3, 240, "Description").optional(),
  price: z.number().int().min(1).max(100000).optional(), active: z.boolean().optional(), available: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one field is required");
const urlOrEmpty = z.union([z.literal(""), z.string().url().max(500)]).transform((value) => value || null);
const nullableText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
export const menuCreateSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  name: cleanText(2, 100, "Name"), description: cleanText(3, 240, "Description"), longDescription: cleanText(10, 1000, "Long description"),
  category: menuCategory, price: z.number().int().min(1).max(100000), imageUrl: localMenuImage.optional().default(""), imagePosition: nullableText(40).optional().default(""), badge: z.union([z.literal(""), z.enum(["Bestseller", "New", "Popular"])]).transform((value) => value || null).optional().default(null),
  dietary: z.array(z.enum(["vegetarian", "vegan", "gluten-free"])).max(3).default([]), ingredients: z.array(z.string().trim().min(1).max(80)).max(30), allergens: z.array(z.string().trim().min(1).max(80)).max(30), active: z.boolean().default(true), available: z.boolean().default(true),
});
export const menuUpdateSchema = menuCreateSchema.partial().refine((value) => Object.keys(value).length > 0, "At least one field is required");
export const inquiryAdminSchema = z.object({ status: z.literal("RESOLVED") });
export const subscriberAdminSchema = z.object({ active: z.boolean() });
export const tableCreateSchema = z.object({ name: cleanText(1, 80, "Table name"), seats: z.number().int().min(1).max(30), active: z.boolean().default(true) });
export const tableUpdateSchema = tableCreateSchema.partial().refine((value) => Object.keys(value).length > 0, "At least one field is required");
export const businessSettingsSchema = z.object({
  displayName: cleanText(2, 100, "Display name"), address: nullableText(300), phone: nullableText(40), contactEmail: z.union([z.literal(""), email]).transform((value) => value || null), mapUrl: urlOrEmpty, instagramUrl: urlOrEmpty, facebookUrl: urlOrEmpty,
  openingHour: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), closingHour: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), kitchenClosingHour: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  pickupEnabled: z.boolean(), pickupLeadMinutes: z.number().int().min(0).max(180), reservationEnabled: z.boolean(), reservationDurationMinutes: z.number().int().min(30).max(240), reservationSlotMinutes: z.number().int().min(15).max(120), reservationCutoffMinutes: z.number().int().min(0).max(1440), maxGuestsPerReservation: z.number().int().min(1).max(10),
}).refine((value) => value.openingHour < value.closingHour, { message: "Closing time must be after opening time", path: ["closingHour"] });

export type OrderFormValues = z.input<typeof orderFormSchema>;
export type OrderRequest = z.output<typeof orderRequestSchema>;
export type ReservationFormValues = z.input<typeof reservationFormSchema>;
export type ReservationRequest = z.output<typeof reservationRequestSchema>;
export type ContactInput = z.output<typeof contactSchema>;
