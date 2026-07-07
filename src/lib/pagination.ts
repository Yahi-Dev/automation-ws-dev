// src/lib/pagination.ts
// Paginación keyset (por id desc) + límite acotado para los listados.
// Evita traer tablas completas a memoria/red (OOM a gran escala).
// El id autoincrement correlaciona con createdAt, así que el orden visible no cambia.

export function parsePagination(
  searchParams: URLSearchParams,
  opts?: { defaultLimit?: number; maxLimit?: number }
): { limit: number; cursor?: number } {
  const def = opts?.defaultLimit ?? 100;
  const max = opts?.maxLimit ?? 500;
  const raw = Number(searchParams.get("limit"));
  const limit = Math.min(Math.max(1, Number.isFinite(raw) && raw > 0 ? raw : def), max);
  const cursorRaw = searchParams.get("cursor");
  const cursorNum = Number(cursorRaw);
  const cursor = cursorRaw && Number.isInteger(cursorNum) && cursorNum > 0 ? cursorNum : undefined;
  return { limit, cursor };
}

/** Args de Prisma para keyset por id desc (spread en el findMany). */
export function keysetArgs(limit: number, cursor?: number) {
  return {
    take: limit,
    orderBy: { id: "desc" as const },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  };
}

/** nextCursor = id del último elemento si la página vino llena. */
export function nextCursorOf<T extends { id: number }>(items: T[], limit: number): number | null {
  return items.length === limit && items.length > 0 ? items[items.length - 1].id : null;
}
