// Carga el .env igual que hace el worker, para que los modulos que instancian
// PrismaClient al importarse no revienten. No abre ninguna conexion: Prisma
// conecta de forma perezosa en la primera consulta.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true, { info: () => {}, error: () => {} });

process.env.DATABASE_URL ||= "mysql://test:test@127.0.0.1:3306/test";
