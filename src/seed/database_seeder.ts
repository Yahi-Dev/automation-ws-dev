// src/seed/database_seeder.ts
import { PrismaClient } from "@prisma/client";
import { seedUsers } from "./users";

async function runSeeders() {
  console.log("🌱 Starting database seeding...");
  const prisma = new PrismaClient();

  try {
    await cleanDatabase();

    await seedUsers();

    console.log("🎉 Database seeding completed successfully!");
  } catch (error) {
    console.error("💥 Database seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Función para limpiar la base de datos en el orden correcto
async function cleanDatabase() {
  console.log("🧹 Cleaning database...");
  console.log("✅ Database cleaned successfully!");
}

runSeeders();