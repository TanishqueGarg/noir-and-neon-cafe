import { db } from "@/lib/db";
import { requireDatabaseUrl, SetupRequiredError } from "@/lib/env";
import { menuItems as sampleMenu } from "@/data/menu";
import { publicBusiness } from "@/data/site";
import type { DietaryTag, MenuCategory, MenuItem, ProductBadge } from "@/types";
import { unstable_cache } from "next/cache";

export const PUBLIC_MENU_TAG = "public-menu";
export const PUBLIC_BUSINESS_TAG = "public-business";

const array = (value: unknown) => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
const mapMenu = (row: Awaited<ReturnType<typeof db.menuItem.findMany>>[number]): MenuItem => ({
  id: row.id, slug: row.slug, name: row.name, description: row.description, longDescription: row.longDescription,
  category: row.category as MenuCategory, price: row.price, image: row.imageUrl || "/images/signature-drinks.png", imagePosition: row.imagePosition || undefined,
  badge: (row.badge || undefined) as ProductBadge | undefined, dietary: array(row.dietary) as DietaryTag[], ingredients: array(row.ingredients), allergens: array(row.allergens), available: row.available,
});

const cachedMenu = unstable_cache(
  () => db.menuItem.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
  [PUBLIC_MENU_TAG],
  { revalidate: 300, tags: [PUBLIC_MENU_TAG] },
);

const cachedBusiness = unstable_cache(
  () => db.businessSetting.findUnique({ where: { id: "primary" } }),
  [PUBLIC_BUSINESS_TAG],
  { revalidate: 300, tags: [PUBLIC_BUSINESS_TAG] },
);

export async function getPublicMenu() {
  try { requireDatabaseUrl(); } catch (error) { if (error instanceof SetupRequiredError) return sampleMenu; throw error; }
  const rows = await cachedMenu();
  return rows.map(mapMenu);
}

export async function getPublicMenuItem(slug: string) { return (await getPublicMenu()).find((item) => item.slug === slug); }

export async function getPublicBusiness() {
  try { requireDatabaseUrl(); } catch (error) { if (error instanceof SetupRequiredError) return publicBusiness; throw error; }
  const settings = await cachedBusiness();
  if (!settings) return publicBusiness;
  return { address: settings.address || "Business address pending launch configuration", phone: settings.phone || "Phone number pending launch configuration", mapUrl: settings.mapUrl || "", instagramUrl: settings.instagramUrl || "", openingHours: `${settings.openingHour}–${settings.closingHour} daily`, configured: Boolean(settings.address && settings.phone) };
}
