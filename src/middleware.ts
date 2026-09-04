import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { loginRateLimit } from './lib/rate-limit'
import { getClientIp } from './lib/client-ip'

type AllowedMethod = 'POST'

// Endpoints de auth protegidos por rate limiting.
const RATE_LIMITED_ENDPOINTS = {
  '/api/auth/sign-in/email': ['POST'], // incrementa intentos
  '/api/auth/forgot-password': ['POST'], // solo verifica bloqueo
  '/api/auth/reset-password': ['POST'], // solo verifica bloqueo
} as const

function sendTooManyRequests(message: string, retryAfter?: number) {
  const response = NextResponse.json(
    { error: 'Too Many Requests', message, retryAfter },
    { status: 429 }
  )
  if (retryAfter) response.headers.set('Retry-After', retryAfter.toString())
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  const endpointConfig =
    RATE_LIMITED_ENDPOINTS[pathname as keyof typeof RATE_LIMITED_ENDPOINTS]
  if (!endpointConfig || !endpointConfig.includes(method as AllowedMethod)) {
    return NextResponse.next()
  }

  const ip = getClientIp(request)
  if (!ip) {
    // FALLO CERRADO. Antes se dejaba pasar, y eso convertia "no se pudo
    // determinar la IP" en "sin limite de intentos": justo el escenario que el
    // rate-limit debe cubrir. Si esto se dispara, la topologia de red no esta
    // declarada; se arregla con configuracion, no relajando el gate.
    console.error(
      "[rate-limit] No se pudo determinar la IP del cliente. " +
        "Declara TRUST_PLATFORM_HEADERS=true (si hay Cloudflare o similar delante) " +
        "o TRUSTED_PROXY_HOPS=N (numero de proxies propios). Peticion bloqueada."
    )
    return sendTooManyRequests(
      "No se pudo verificar el origen de la petición. Inténtalo de nuevo más tarde."
    )
  }

  try {
    // Login incrementa el contador; el resto solo consulta el estado.
    const rateLimitResult =
      pathname === '/api/auth/sign-in/email' && method === 'POST'
        ? await loginRateLimit.incrementAttempt(ip)
        : await loginRateLimit.getRemaining(ip)

    if (rateLimitResult.isBlocked) {
      return sendTooManyRequests(
        `IP temporalmente bloqueada. Intenta nuevamente en ${rateLimitResult.retryAfter} segundos.`,
        rateLimitResult.retryAfter
      )
    }

    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', '10')
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString())
    return response
  } catch (error) {
    // FALLO CERRADO. Un error del backend de rate-limit (Redis caido, por
    // ejemplo) no puede traducirse en "adelante, sin limite": seria suficiente
    // con tumbar Redis para desactivar la proteccion contra fuerza bruta.
    console.error('Error en rate limiting:', error)
    return sendTooManyRequests(
      "El servicio de autenticación no está disponible en este momento. Inténtalo de nuevo en unos minutos."
    )
  }
}

export const config = {
  matcher: [
    '/api/auth/sign-in/email',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
  ],
}
