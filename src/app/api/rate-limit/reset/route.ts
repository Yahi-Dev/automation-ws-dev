
import { loginRateLimit } from '@/src/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    
    if (!ip) {
      return NextResponse.json(
        { error: 'Could not determine IP address' },
        { status: 400 }
      )
    }

    // Resetear intentos para esta IP
    const success = await loginRateLimit.resetAttempts(ip)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Rate limit reset successfully'
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to reset rate limit' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Rate limit reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getClientIP(request: NextRequest): string | null {
  try {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    
    if (forwarded) {
      const ips = forwarded.split(',').map(ip => ip.trim())
      return ips[0] || null
    }
    
    if (cfConnectingIP) return cfConnectingIP
    if (realIP) return realIP
    
    return process.env.NODE_ENV === 'development' ? '127.0.0.1' : null
  } catch {
    return null
  }
}