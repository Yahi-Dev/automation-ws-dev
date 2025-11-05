import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionCookie } from "better-auth/cookies";
import { Redis } from "@upstash/redis";
import { loginRateLimit } from './lib/rate-limit';

type AllowedMethod = 'POST';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const RATE_LIMITED_ENDPOINTS = {
  '/api/auth/sign-in/email': ['POST'], // Incrementa intentos
  '/api/auth/forgot-password': ['POST'], // Solo verifica bloqueo
  '/api/auth/reset-password': ['POST'] // Solo verifica bloqueo
} as const;

// Función auxiliar para respuestas de too many requests
function sendTooManyRequests(message: string, retryAfter?: number) {
  const response = NextResponse.json(
    {
      error: 'Too Many Requests',
      message,
      retryAfter
    },
    { status: 429 }
  );

  if (retryAfter) {
    response.headers.set('Retry-After', retryAfter.toString());
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Verificar si es un endpoint protegido por rate limiting
  const endpointConfig = RATE_LIMITED_ENDPOINTS[pathname as keyof typeof RATE_LIMITED_ENDPOINTS];
  if (endpointConfig && endpointConfig.includes(method as AllowedMethod)) {
    const ip = getClientIP(request);
    if (!ip) return NextResponse.next();

    try {
      let rateLimitResult;

      // ✅ CORREGIDO: Usar incrementAttempt para login
      if (pathname === '/api/auth/sign-in/email' && method === 'POST') {
        rateLimitResult = await loginRateLimit.incrementAttempt(ip);
      } else {
        // Para otros endpoints: solo verificar estado
        rateLimitResult = await loginRateLimit.getRemaining(ip);
      }

      if (rateLimitResult.isBlocked) {
        return sendTooManyRequests(
          `IP temporalmente bloqueada. Intenta nuevamente en ${rateLimitResult.retryAfter} segundos.`,
          rateLimitResult.retryAfter
        );
      }

      // Si no está bloqueado, permitir la request
      const response = NextResponse.next();

      // Agregar headers informativos
      response.headers.set('X-RateLimit-Limit', '10');
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

      return response;

    } catch (error) {
      // En caso de error en rate limiting, permitir el acceso
      console.error('Error en rate limiting:', error);
      return NextResponse.next();
    }
  }

  // Lógica original de autenticación
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const status = await redis.get<string>(`sess_status:${sessionCookie}`);

  // Si hay cache y no está aprobado, bloquea.
  if (status && status !== "approved") {
    return NextResponse.redirect(new URL("/login?pending=1", request.url));
  }

  // Si no hay cache, deja pasar: el layout hará la verificación con DB y refrescará cache.
  return NextResponse.next();
}

function getClientIP(request: NextRequest): string | null {
  try {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')

    if (forwarded) {
      const ips = forwarded.split(',').map((ip: string) => ip.trim())
      return ips[0] || null
    }

    if (cfConnectingIP) return cfConnectingIP
    if (realIP) return realIP

    return process.env.NODE_ENV === 'development' ? '127.0.0.1' : null
  } catch {
    return null
  }
}

export const config = {
  matcher: [
    '/(authenticated)(.*)',
    '/api/auth/sign-in/email',
    '/api/auth/forgot-password',
    '/api/auth/reset-password'
  ]
};