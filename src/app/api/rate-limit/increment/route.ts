import { loginRateLimit } from '@/src/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { getClientIp } from '@/src/lib/client-ip'
import { requireAuth } from '@/src/lib/authz'

// El incremento REAL del contador de fuerza bruta ocurre en el middleware sobre el
// POST de sign-in. Este endpoint (llamado por la UI) queda protegido con sesion para
// que un anonimo NO pueda incrementar el contador de una IP arbitraria (lockout dirigido).
export async function POST(request: NextRequest) {
  try {
    const gate = await requireAuth(request)
    if ('response' in gate) return gate.response

    const ip = getClientIp(request)
    if (!ip) {
      return NextResponse.json({ error: 'Could not determine IP address' }, { status: 400 })
    }

    const rateLimitResult = await loginRateLimit.incrementAttempt(ip)
    return NextResponse.json(rateLimitResult)
  } catch (error) {
    console.error('Rate limit increment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}