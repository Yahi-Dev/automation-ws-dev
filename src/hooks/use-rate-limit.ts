import { useState, useCallback, useEffect } from 'react'

interface RateLimitState {
  isBlocked: boolean
  attempts: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

export function useRateLimit() {
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null)
  const [loading, setLoading] = useState(true)

  const checkRateLimit = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/rate-limit/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRateLimit(data)
        return data
      } else {
        console.warn('Rate limit check failed, allowing request')
        return null
      }
    } catch (error) {
      console.error('Error checking rate limit:', error)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // ✅ NUEVO: Función para incrementar intentos fallidos
  const incrementFailedAttempt = useCallback(async () => {
    try {
      const response = await fetch('/api/rate-limit/increment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRateLimit(data)
        return data
      } else {
        console.warn('Rate limit increment failed')
        return null
      }
    } catch (error) {
      console.error('Error incrementing rate limit:', error)
      return null
    }
  }, [])

  // Función para resetear rate limit
  const resetRateLimit = useCallback(async () => {
    try {
      const response = await fetch('/api/rate-limit/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Actualizar el estado local después del reset
        await checkRateLimit()
        return true
      }
      return false
    } catch (error) {
      console.error('Error resetting rate limit:', error)
      return false
    }
  }, [checkRateLimit])

  // Verificar automáticamente al montar el componente
  useEffect(() => {
    checkRateLimit()
  }, [checkRateLimit])

  return {
    rateLimit,
    loading,
    checkRateLimit,
    incrementFailedAttempt, // ✅ NUEVO
    resetRateLimit,
    refresh: () => checkRateLimit()
  }
}