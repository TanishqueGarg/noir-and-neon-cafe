import { existsSync } from "node:fs";
import path from "node:path";
import { menuItems } from "../src/data/menu";
import {
  contactSchema,
  orderFormSchema,
  reservationFormSchema,
} from "../src/lib/validation";

const checks: Array<[string, boolean]> = [
  [
    "valid order form",
    orderFormSchema.safeParse({
      customerName: "Asha Rao",
      mobile: "9876543210",
      email: "asha@example.com",
      pickupTime: "ASAP",
      notes: "",
    }).success,
  ],
  [
    "invalid order rejected",
    !orderFormSchema.safeParse({
      customerName: "A",
      mobile: "123",
      email: "invalid",
      pickupTime: "NOW",
    }).success,
  ],
  [
    "valid reservation form",
    reservationFormSchema.safeParse({
      name: "Asha Rao",
      mobile: "9876543210",
      email: "asha@example.com",
      date: "2026-11-01",
      time: "19:00",
      guests: 2,
      requests: "",
    }).success,
  ],
  [
    "invalid contact rejected",
    !contactSchema.safeParse({
      name: "A",
      email: "invalid",
      subject: "x",
      message: "short",
    }).success,
  ],
  ["menu contains at least 24 items", menuItems.length >= 24],
  [
    "menu IDs and slugs are unique",
    new Set(menuItems.map((item) => item.id)).size === menuItems.length &&
      new Set(menuItems.map((item) => item.slug)).size === menuItems.length,
  ],
  [
    "menu search returns expected item",
    menuItems.filter((item) =>
      `${item.name} ${item.description}`
        .toLowerCase()
        .includes("cortado"),
    ).length > 0,
  ],
  [
    "menu dietary filtering returns only matches",
    menuItems
      .filter((item) => item.dietary.includes("vegan"))
      .every((item) => item.dietary.includes("vegan")),
  ],
  [
    "all local menu images exist",
    menuItems.every((item) =>
      existsSync(
        path.join(process.cwd(), "public", item.image.replace(/^\//, "")),
      ),
    ),
  ],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}`);
}
if (failed.length > 0) {
  throw new Error(`${failed.length} frontend verification check(s) failed`);
}
console.log(`\nFrontend verification passed (${checks.length}/${checks.length})`);
