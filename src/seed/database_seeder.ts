// src/seed/database_seeder.ts
import { PrismaClient } from "@prisma/client";
import { seedUsers } from "./users";
import { bootstrapAdmin } from "./bootstrap-admin";

async function runSeeders() {
  console.log("🌱 Starting database seeding...");
  const prisma = new PrismaClient();

  try {
    await cleanDatabase();

    await seedUsers();

    // Arranque en frio: sin esto, todos los usuarios nacen pending/user y no
    // hay forma de promover al primer administrador desde la aplicacion.
    const admin = await bootstrapAdmin(prisma);
    if (admin.action === "promovido") {
      console.log(`👑 ${admin.email} es ahora administrador aprobado.`);
    } else {
      console.log(`ℹ️  Bootstrap de administrador sin cambios: ${admin.reason}`);
    }

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