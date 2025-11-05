// lib/http.ts
const bigintReplacer = (_: string, value: unknown) =>
  typeof value === 'bigint' ? value.toString() : value

function makeJsonBody<T>(data: T) {
  return JSON.stringify(data, bigintReplacer)
}

export function json<T>(data: T, init?: ResponseInit) {
  return new Response(makeJsonBody(data), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(init?.headers || {}),
    },
  })
}

export function ok(message = 'OK', data?: unknown, init?: ResponseInit) {
  return json({ success: true, message, ...(data !== undefined ? { data } : {}) }, { status: init?.status ?? 200, ...init })
}

export function badRequest(message: string, errors?: unknown) {
  return json({ success: false, message, ...(errors ? { errors } : {}) }, { status: 400 })
}

export function notFound(message = 'Recurso no encontrado') {
  return json({ success: false, message }, { status: 404 })
}

export function serverError(error: unknown) {
  console.error(error)
  return json({
    success: false,
    message: 'Error interno del servidor',
    error: error instanceof Error ? error.message : String(error),
  }, { status: 500 })
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || '20')))
  const skip = (page - 1) * pageSize
  return { page, pageSize, skip, take: pageSize }
}