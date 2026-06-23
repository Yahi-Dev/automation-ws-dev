// src/seed/users.ts
import { auth } from "../lib/auth";

type SeedUser = {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  image?: string;
};

/**
 * Lee los usuarios a sembrar desde la variable de entorno SEED_USERS
 * (un JSON array). De esta forma NO se commitean credenciales en el repo.
 *
 * Ejemplo en .env (archivo local, ignorado por git):
 *   SEED_USERS='[{"email":"admin@example.com","password":"changeme","name":"Admin","phone":"8090000001"}]'
 */
function getSeedUsers(): SeedUser[] {
  const raw = process.env.SEED_USERS;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn("⚠️ SEED_USERS debe ser un JSON array. Se omite el seeding de usuarios.");
      return [];
    }
    return parsed.filter((u): u is SeedUser => Boolean(u?.email && u?.password));
  } catch (err) {
    console.warn("⚠️ No se pudo parsear SEED_USERS como JSON. Se omite el seeding de usuarios.", err);
    return [];
  }
}

export async function seedUsers() {
  console.log("👥 Seeding users for Better Auth...");

  const users = getSeedUsers();

  if (users.length === 0) {
    console.log(
      "💡 No hay usuarios para sembrar. Define SEED_USERS en tu .env (JSON array con email y password) y vuelve a ejecutar el seed."
    );
    return [];
  }

  const createdUsers: Array<{ email: string; password: string; user: unknown }> = [];

  for (const seedUser of users) {
    const { email, password, name, phone, image } = seedUser;

    try {
      console.log(`📝 Creating user: ${email}`);

      const res = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: name ?? email.split("@")[0],
          phone: phone ?? "",
          image: image ?? "https://via.placeholder.com/150",
        },
      });

      if (res.user) {
        console.log(`✅ User created: ${email}`);
        createdUsers.push({ email, password, user: res.user });
      }
    } catch (error: unknown) {
      // Si el usuario ya existe, intentar hacer login para verificar
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
        console.log(`⚠️ User already exists, verifying: ${email}`);

        try {
          const signInResult = await auth.api.signInEmail({
            body: { email, password },
          });

          if (signInResult.user) {
            console.log(`✅ User verified: ${email}`);
            createdUsers.push({ email, password, user: signInResult.user });
          }
        } catch (signInError) {
          console.error(`❌ Failed to verify user ${email}:`, signInError);
          console.log(`🔧 User exists but password may be different: ${email}`);
        }
      } else {
        console.error(`❌ Failed to create user ${email}:`, error);
      }
    }
  }

  console.log("✅ Users seeding completed!");
  console.log("📊 Summary:");
  createdUsers.forEach((user) => {
    console.log(`👤 ${user.email}`);
  });

  if (createdUsers.length === 0) {
    console.log("💡 Tip: If users exist but passwords don't match, you may need to:");
    console.log("   1. Delete existing users from the database");
    console.log("   2. Run the seed again");
  }

  return createdUsers;
}
