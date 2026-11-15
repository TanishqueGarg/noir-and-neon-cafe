import { PrismaClient } from "@prisma/client";
import { menuItems } from "../src/data/menu";

if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEVELOPMENT_SEED !== "true") {
  throw new Error("Development seed refused. Use a non-production database and explicitly set ALLOW_DEVELOPMENT_SEED=true.");
}

const prisma = new PrismaClient();

async function seed() {
  await prisma.businessSetting.upsert({
    where: { id: "primary" },
    create: { id: "primary" },
    update: {},
  });

  const tables = [
    { name: "Window 2", seats: 2 },
    { name: "Window 4", seats: 4 },
    { name: "Communal 6", seats: 6 },
    { name: "Lounge 4", seats: 4 },
  ];

  for (const table of tables) {
    await prisma.tableInventory.upsert({
      where: { name: table.name },
      create: table,
      update: { seats: table.seats, active: true },
    });
  }

  for (const [sortOrder, item] of menuItems.entries()) {
    const data = {
      slug: item.slug,
      name: item.name,
      description: item.description,
      longDescription: item.longDescription,
      category: item.category,
      price: item.price,
      imageUrl: item.image,
      imagePosition: item.imagePosition ?? null,
      badge: item.badge ?? null,
      dietary: item.dietary,
      ingredients: item.ingredients,
      allergens: item.allergens,
      sortOrder,
    };

    await prisma.menuItem.upsert({
      where: { id: item.id },
      create: { id: item.id, ...data },
      update: data,
    });
  }
}

seed()
  .then(() => console.info(`Seeded ${menuItems.length} menu items and baseline café settings.`))
  .finally(async () => prisma.$disconnect());
