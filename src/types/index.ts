export type MenuCategory =
  | "Signature Coffee"
  | "Cold Brews"
  | "Matcha & Specialty Drinks"
  | "Breakfast"
  | "Sandwiches & Savory"
  | "Desserts"
  | "Seasonal Specials";

export type DietaryTag = "vegetarian" | "vegan" | "gluten-free";
export type ProductBadge = "Bestseller" | "New" | "Popular";

export interface MenuItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  category: MenuCategory;
  price: number;
  image: string;
  imagePosition?: string;
  badge?: ProductBadge;
  dietary: DietaryTag[];
  ingredients: string[];
  allergens: string[];
  available?: boolean;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface OrderInput {
  customerName: string;
  mobile: string;
  email: string;
  pickupTime: string;
  notes?: string;
  items: Array<{ menuItemId: string; quantity: number }>;
}

export interface ReservationInput {
  name: string;
  email: string;
  mobile: string;
  date: string;
  time: string;
  guests: number;
  requests?: string;
}

export interface OrderReceipt {
  id: string;
  reference: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "READY" | "COMPLETED" | "CANCELLED";
  total: number;
  pickupTime: string;
  fulfillment: "PICKUP";
  paymentMethod: "PAY_AT_COUNTER";
  emailAccepted: boolean;
}

export interface ReservationReceipt {
  id: string;
  reference: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  date: string;
  time: string;
  emailAccepted: boolean;
}

export interface AvailabilitySlot {
  time: string;
  status: "available" | "limited" | "unavailable";
  remainingSeats: number;
}
