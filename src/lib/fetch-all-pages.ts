// src/lib/fetch-all-pages.ts
// Helper de cliente: recorre TODAS las páginas keyset de un endpoint de listado
// (por ?limit + ?cursor) y devuelve el arreglo completo.
//
// Objetivo: la UI sigue recibiendo el arreglo entero exactamente como antes
// (sin cambios visuales), pero cada consulta al backend queda ACOTADA por `limit`
// e indexada por cursor, evitando escaneos de tabla completa en una sola query.
//
// Requiere que el endpoint devuelva el arreglo en `data` (envelope de HttpResponse)
// y que cada item tenga `id` numérico descendente (keyset por id desc).

export async function fetchAllPages<T extends { id: number }>(
  baseUrl: URL,
  opts?: { pageSize?: number; maxPages?: number }
): Promise<T[]> {
  const pageSize = opts?.pageSize ?? 500;
  const maxPages = opts?.maxPages ?? 1000; // tope de seguridad (~500k filas) contra bucles patológicos
  const all: T[] = [];
  let cursor: number | undefined;

  for (let i = 0; i < maxPages; i++) {
    const url = new URL(baseUrl.toString());
    url.searchParams.set("limit", String(pageSize));
    if (cursor !== undefined) url.searchParams.set("cursor", String(cursor));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

    const json = await res.json();
    const page: T[] = Array.isArray(json?.data) ? json.data : [];
    all.push(...page);

    // Página incompleta => no hay más datos.
    if (page.length < pageSize) break;

    const last = page[page.length - 1];
    if (!last || typeof last.id !== "number") break;
    cursor = last.id;
  }

  return all;
}
