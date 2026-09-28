import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding billing database...");

  // Servicio event-driven: folios nacen de `booking.created` y se cierran
  // con `checkout.completed`. Sin IDs reales no hay nada que sembrar.
  console.log("No seed data required: folios and invoices are event-driven.");
  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
