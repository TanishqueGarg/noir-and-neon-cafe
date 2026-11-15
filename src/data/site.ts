export const publicBusiness = {
  address: process.env.NEXT_PUBLIC_CAFE_ADDRESS || "Business address pending launch configuration",
  phone: process.env.NEXT_PUBLIC_CAFE_PHONE || "Phone number pending launch configuration",
  mapUrl: process.env.NEXT_PUBLIC_MAP_URL || "",
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "",
  openingHours: "Opening hours pending launch configuration",
  configured: Boolean(process.env.NEXT_PUBLIC_CAFE_ADDRESS && process.env.NEXT_PUBLIC_CAFE_PHONE),
} as const;
