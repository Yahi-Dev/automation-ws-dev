// src/seed/users.ts
import { auth } from "../lib/auth";

export async function seedUsers() {
  console.log("👥 Seeding users for Better Auth...");

  const user1Email = "yahinnieltheking01@gmail.com";
  const user1Password = "password123";
  const user2Email = "yahinnielvas@gmail.com";
  const user2Password = "password456";

  const createdUsers = [];

  // Crear usuario 1
  try {
    console.log(`📝 Creating user: ${user1Email}`);

    const user1Res = await auth.api.signUpEmail({
      body: {
        email: user1Email,
        password: user1Password,
        name: "Usuario Uno",
        phone: "8090000001",
        image: "https://via.placeholder.com/150",
      },
    });

    if (user1Res.user) {
      console.log(`✅ User created: ${user1Email}`);
      createdUsers.push({
        email: user1Email,
        password: user1Password,
        user: user1Res.user
      });
    }

  } catch (error: unknown) {
    // Si el usuario ya existe, intentar hacer login para verificar
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
      console.log(`⚠️ User already exists, verifying: ${user1Email}`);

      try {
        const signInResult = await auth.api.signInEmail({
          body: {
            email: user1Email,
            password: user1Password,
          },
        });

        if (signInResult.user) {
          console.log(`✅ User verified: ${user1Email}`);
          createdUsers.push({
            email: user1Email,
            password: user1Password,
            user: signInResult.user
          });
        }
      } catch (signInError) {
        console.error(`❌ Failed to verify user ${user1Email}:`, signInError);
        // Si el login falla, el usuario existe pero la contraseña es diferente
        console.log(`🔧 User exists but password may be different: ${user1Email}`);
      }
    } else {
      console.error(`❌ Failed to create user ${user1Email}:`, error);
    }
  }

  // Crear usuario 2
  try {
    console.log(`📝 Creating user: ${user2Email}`);

    const user2Res = await auth.api.signUpEmail({
      body: {
        email: user2Email,
        password: user2Password,
        name: "Usuario Dos",
        phone: "8090000002",
        image: "https://via.placeholder.com/150",
      },
    });

    if (user2Res.user) {
      console.log(`✅ User created: ${user2Email}`);
      createdUsers.push({
        email: user2Email,
        password: user2Password,
        user: user2Res.user
      });
    }
  } catch (error: unknown) {
    // Si el usuario ya existe, intentar hacer login para verificar
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
      console.log(`⚠️ User already exists, verifying: ${user2Email}`);
      console.log(`⚠️ User already exists, verifying: ${user2Email}`);

      try {
        const signInResult = await auth.api.signInEmail({
          body: {
            email: user2Email,
            password: user2Password,
          },
        });

        if (signInResult.user) {
          console.log(`✅ User verified: ${user2Email}`);
          createdUsers.push({
            email: user2Email,
            password: user2Password,
            user: signInResult.user
          });
        }
      } catch (signInError) {
        console.error(`❌ Failed to verify user ${user2Email}:`, signInError);
        // Si el login falla, el usuario existe pero la contraseña es diferente
        console.log(`🔧 User exists but password may be different: ${user2Email}`);
      }
    } else {
      console.error(`❌ Failed to create user ${user2Email}:`, error);
    }
  }

  console.log("✅ Users seeding completed!");
  console.log("📊 Summary:");
  createdUsers.forEach(user => {
    console.log(`👤 ${user.email} / ${user.password}`);
  });

  if (createdUsers.length === 0) {
    console.log("💡 Tip: If users exist but passwords don't match, you may need to:");
    console.log("   1. Delete existing users from the database");
    console.log("   2. Run the seed again");
  }

  return createdUsers;
}