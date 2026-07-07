import { loginRateLimit } from '@/src/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { getClientIp } from '@/src/lib/client-ip'
import { requireAuth } from '@/src/lib/authz'

// Requiere sesion valida: el reset del bloqueo/intentos solo debe ocurrir cuando el
// usuario ya se autentico (la UI lo llama tras un login exitoso). Un anonimo NO puede
// borrar su contador de fuerza bruta.
export async function POST(request: NextRequest) {
  try {
    const gate = await requireAuth(request)
    if ('response' in gate) return gate.response

    const ip = getClientIp(request)
    if (!ip) {
      return NextResponse.json({ error: 'Could not determine IP address' }, { status: 400 })
    }

    const success = await loginRateLimit.resetAttempts(ip)
    if (success) {
      return NextResponse.json({ success: true, message: 'Rate limit reset successfully' })
    }
    return NextResponse.json({ error: 'Failed to reset rate limit' }, { status: 500 })
  } catch (error) {
    console.error('Rate limit reset error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}