import { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Pooling de conexiones (F3)
// Cada proceso (cada instancia de la app y cada worker) abre su propio pool.
// El tamaño por defecto de Prisma es (num_cpus * 2 + 1); con varias instancias +
// worker se puede agotar "max_connections" de MySQL. Para controlarlo sin editar
// la URL a mano, se pueden definir:
//   DB_CONNECTION_LIMIT  -> conexiones máximas del pool por proceso (p. ej. 10)
//   DB_POOL_TIMEOUT      -> segundos de espera por una conexión antes de fallar
// Regla práctica de dimensionamiento:
//   sum(connection_limit de TODAS las instancias y workers) < max_connections de MySQL.
// Para pooling gestionado (Prisma Accelerate `prisma://` o PgBouncer/ProxySQL),
// apunta DATABASE_URL al pooler; en ese caso NO se anexan estos parámetros.
// ---------------------------------------------------------------------------
function buildDbUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;

  const limit = process.env.DB_CONNECTION_LIMIT;
  const poolTimeout = process.env.DB_POOL_TIMEOUT;
  if (!limit && !poolTimeout) return base;

  try {
    const u = new URL(base);
    // Accelerate gestiona su propio pool: no tocar.
    if (u.protocol === "prisma:") return base;
    if (limit && !u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", limit);
    if (poolTimeout && !u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", poolTimeout);
    return u.toString();
  } catch {
    return base;
  }
}

const prismaClientSingleton = () => {
  const url = buildDbUrl();
  return url ? new PrismaClient({ datasources: { db: { url } } }) : new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
