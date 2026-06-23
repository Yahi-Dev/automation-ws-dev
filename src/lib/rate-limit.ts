// src/lib/rate-limit.ts
import redis from "./redis"

// Store de rate limiting respaldado por el cliente resiliente `redis`
// (Upstash si está disponible; fallback en memoria por proceso si no).
// Las claves se prefijan con `rate-limit:`.
const store = {
  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const k = `rate-limit:${key}`
    const resetTime = Date.now() + windowMs
    const count = await redis.incr(k)
    if (count === 1) {
      // Primera vez en la ventana: establecer expiración
      await redis.pexpire(k, windowMs)
    }
    return { count, resetTime }
  },

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const k = `rate-limit:${key}`
    const count = await redis.get<number>(k)
    const ttl = await redis.pttl(k)
    if (count === null || ttl <= 0) {
      return null
    }
    return { count, resetTime: Date.now() + ttl }
  },

  async delete(key: string): Promise<void> {
    await redis.del(`rate-limit:${key}`)
  },
}

export interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  blockDurationMs: number
}

export interface RateLimitResult {
  isBlocked: boolean
  attempts: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

export class RateLimitService {
  constructor(private config: RateLimitConfig) { }

  async check(identifier: string): Promise<RateLimitResult> {
    try {
      const now = Date.now()
      const blockKey = `block:${identifier}`
      const attemptKey = `attempt:${identifier}`

      // Verificar si está bloqueado
      const blockInfo = await store.get(blockKey)
      if (blockInfo) {
        const retryAfter = Math.ceil((blockInfo.resetTime - now) / 1000)
        return {
          isBlocked: true,
          attempts: 0,
          remaining: 0,
          resetTime: blockInfo.resetTime,
          retryAfter
        }
      }

      // Verificar intentos actuales
      const attemptInfo = await store.increment(attemptKey, this.config.windowMs)

      if (attemptInfo.count >= this.config.maxAttempts) {
        // Bloquear IP
        await store.increment(blockKey, this.config.blockDurationMs)

        return {
          isBlocked: true,
          attempts: attemptInfo.count,
          remaining: 0,
          resetTime: attemptInfo.resetTime,
          retryAfter: Math.ceil(this.config.blockDurationMs / 1000)
        }
      }

      return {
        isBlocked: false,
        attempts: attemptInfo.count,
        remaining: Math.max(0, this.config.maxAttempts - attemptInfo.count),
        resetTime: attemptInfo.resetTime
      }
    } catch (error) {
      console.error('Rate limit check error:', error)
      // En caso de error, permitir el acceso
      return {
        isBlocked: false,
        attempts: 0,
        remaining: this.config.maxAttempts,
        resetTime: Date.now() + this.config.windowMs
      }
    }
  }


  async incrementAttempt(identifier: string): Promise<RateLimitResult> {
    try {
      const now = Date.now()
      const blockKey = `block:${identifier}`
      const attemptKey = `attempt:${identifier}`

      // Verificar si está bloqueado
      const blockInfo = await store.get(blockKey)
      if (blockInfo) {
        const retryAfter = Math.ceil((blockInfo.resetTime - now) / 1000)
        return {
          isBlocked: true,
          attempts: 0,
          remaining: 0,
          resetTime: blockInfo.resetTime,
          retryAfter
        }
      }

      // SOLO AQUÍ incrementar el contador
      const attemptInfo = await store.increment(attemptKey, this.config.windowMs)

      if (attemptInfo.count >= this.config.maxAttempts) {
        // Bloquear IP
        await store.increment(blockKey, this.config.blockDurationMs)

        return {
          isBlocked: true,
          attempts: attemptInfo.count,
          remaining: 0,
          resetTime: attemptInfo.resetTime,
          retryAfter: Math.ceil(this.config.blockDurationMs / 1000)
        }
      }

      return {
        isBlocked: false,
        attempts: attemptInfo.count,
        remaining: Math.max(0, this.config.maxAttempts - attemptInfo.count),
        resetTime: attemptInfo.resetTime
      }
    } catch (error) {
      console.error('Rate limit increment error:', error)
      return {
        isBlocked: false,
        attempts: 0,
        remaining: this.config.maxAttempts,
        resetTime: Date.now() + this.config.windowMs
      }
    }
  }

  async getRemaining(identifier: string): Promise<RateLimitResult> {
    try {
      const now = Date.now()
      const blockKey = `block:${identifier}`
      const attemptKey = `attempt:${identifier}`

      // Verificar bloqueo
      const blockInfo = await store.get(blockKey)
      if (blockInfo) {
        const retryAfter = Math.ceil((blockInfo.resetTime - now) / 1000)
        return {
          isBlocked: true,
          attempts: 0,
          remaining: 0,
          resetTime: blockInfo.resetTime,
          retryAfter
        }
      }

      // Obtener intentos actuales
      const attemptInfo = await store.get(attemptKey)
      if (!attemptInfo) {
        return {
          isBlocked: false,
          attempts: 0,
          remaining: this.config.maxAttempts,
          resetTime: now + this.config.windowMs
        }
      }

      return {
        isBlocked: false,
        attempts: attemptInfo.count,
        remaining: Math.max(0, this.config.maxAttempts - attemptInfo.count),
        resetTime: attemptInfo.resetTime
      }
    } catch (error) {
      console.error('Rate limit getRemaining error:', error)
      return {
        isBlocked: false,
        attempts: 0,
        remaining: this.config.maxAttempts,
        resetTime: Date.now() + this.config.windowMs
      }
    }
  }

  async resetAttempts(identifier: string): Promise<boolean> {
    try {
      const attemptKey = `attempt:${identifier}`
      const blockKey = `block:${identifier}`

      await store.delete(attemptKey)
      await store.delete(blockKey)

      console.log(`✅ Rate limit reset for IP: ${identifier}`)
      return true
    } catch (error) {
      console.error('Rate limit reset error:', error)
      return false
    }
  }
}

// Configuración para login
export const loginRateLimit = new RateLimitService({
  maxAttempts: 10, // 10 intentos
  windowMs: 15 * 60 * 1000, // 15 minutos
  blockDurationMs: 60 * 60 * 1000, // 1 hora
})
