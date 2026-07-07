import { loginRateLimit } from '@/src/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { getClientIp } from '@/src/lib/client-ip'

// Solo lectura del estado (para mostrar intentos restantes en el login). Publico a
// proposito (se usa antes de autenticar); no modifica contadores.
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    if (!ip) {
      return NextResponse.json({ error: 'Could not determine IP address' }, { status: 400 })
    }

    const rateLimitResult = await loginRateLimit.getRemaining(ip)
    return NextResponse.json(rateLimitResult)
  } catch (error) {
    console.error('Rate limit check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}