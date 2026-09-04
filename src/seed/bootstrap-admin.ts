// src/seed/bootstrap-admin.ts
//
// Arranque en frio: promueve a un usuario a administrador aprobado.
//
// Sin esto el sistema no se puede usar desde cero: tanto el registro publico
// como el seeder crean usuarios con status="pending" y role="user", y el unico
// endpoint que promueve (PATCH /api/admin/users/[id]) exige ya ser admin. La
// unica salida era un UPDATE manual contra MySQL.
//
// Es IDEMPOTENTE y conservador: si ya existe algun administrador aprobado, no
// toca nada. Asi se puede dejar en el arranque del contenedor sin riesgo de
// reabrir privilegios en cada despliegue.
import { PrismaClient } from "@prisma/client";

export type BootstrapResult =
  | { action: "sin-cambios"; reason: string }
  | { action: "promovido"; email: string };

export async function bootstrapAdmin(prisma: PrismaClient): Promise<BootstrapResult> {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();

  const existingAdmins = await prisma.user.count({
    where: { role: "admin", status: "approved", is_deleted: false },
  });

  if (existingAdmins > 0) {
    return {
      action: "sin-cambios",
      reason: `ya existe(n) ${existingAdmins} administrador(es) aprobado(s)`,
    };
  }

  if (!email) {
    return {
      action: "sin-cambios",
      reason:
        "no hay ningun administrador y BOOTSTRAP_ADMIN_EMAIL no esta definida. " +
        "Registra al usuario en la app y define esa variable para promoverlo.",
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return {
      action: "sin-cambios",
      reason:
        `no existe ningun usuario con el correo ${email}. ` +
        "Registralo primero (o siembralo con SEED_USERS) y vuelve a ejecutar.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      role: "admin",
      status: "approved",
      is_deleted: false,
      updated_by: "bootstrap-admin",
    },
  });

  return { action: "promovido", email };
}

// Permite ejecutarlo suelto: `tsx src/seed/bootstrap-admin.ts`
async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await bootstrapAdmin(prisma);
    if (result.action === "promovido") {
      console.log(`✅ ${result.email} es ahora administrador aprobado.`);
    } else {
      console.log(`ℹ️  Sin cambios: ${result.reason}`);
    }
  } catch (error) {
    console.error("💥 Fallo el bootstrap del administrador:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

// Solo se autoejecuta cuando se invoca el archivo directamente
// (`tsx src/seed/bootstrap-admin.ts`), no cuando lo importa el seeder.
if ((process.argv[1] ?? "").includes("bootstrap-admin")) {
  void main();
}
