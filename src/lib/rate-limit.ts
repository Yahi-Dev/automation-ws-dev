import { Redis } from '@upstash/redis'

// Para desarrollo local sin Redis
class MemoryStore {
  private store = new Map<string, { count: number; expiresAt: number }>()
  private timers = new Map<string, NodeJS.Timeout>()

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now()
    const resetTime = now + windowMs
    const entry = this.store.get(key)

    if (!entry || now > entry.expiresAt) {
      // Nueva ventana de tiempo
      this.store.set(key, { count: 1, expiresAt: resetTime })

      // Limpiar timer existente
      const existingTimer = this.timers.get(key)
      if (existingTimer) clearTimeout(existingTimer)

      // Programar limpieza automática
      const timer = setTimeout(() => {
        this.store.delete(key)
        this.timers.delete(key)
      }, windowMs)
      this.timers.set(key, timer)

      return { count: 1, resetTime }
    }

    // Incrementar contador existente
    entry.count++
    return { count: entry.count, resetTime: entry.expiresAt }
  }

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const entry = this.store.get(key)
    const now = Date.now()

    if (!entry || now > entry.expiresAt) {
      return null
    }

    return { count: entry.count, resetTime: entry.expiresAt }
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
    }
  }
}

// Configuración del store (Redis para producción, Memory para desarrollo)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

let store: {
  increment: (key: string, windowMs: number) => Promise<{ count: number; resetTime: number }>
  get: (key: string) => Promise<{ count: number; resetTime: number } | null>
  delete?: (key: string) => Promise<void>
}

if (redisUrl && redisToken) {
  try {
    // Redis para producción
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    })

    store = {
      async increment(key: string, windowMs: number) {
        try {
          const keyWithPrefix = `rate-limit:${key}`
          const now = Date.now()
          const resetTime = now + windowMs

          const result = await redis.incr(keyWithPrefix)

          if (result === 1) {
            // Primera vez - establecer expiración
            await redis.pexpire(keyWithPrefix, windowMs)
          }

          return { count: result, resetTime }
        } catch (error) {
          console.error('Redis increment error:', error)
          // Fallback a memory store en caso de error
          const memoryStore = new MemoryStore()
          return memoryStore.increment(key, windowMs)
        }
      },
      async get(key: string) {
        try {
          const keyWithPrefix = `rate-limit:${key}`
          const count = await redis.get<number>(keyWithPrefix)
          const ttl = await redis.pttl(keyWithPrefix)

          if (count === null || ttl <= 0) {
            return null
          }

          return { count, resetTime: Date.now() + ttl }
        } catch (error) {
          console.error('Redis get error:', error)
          // Fallback a memory store
          const memoryStore = new MemoryStore()
          return memoryStore.get(key)
        }
      },
      async delete(key: string) {
        try {
          const keyWithPrefix = `rate-limit:${key}`
          await redis.del(keyWithPrefix)
        } catch (error) {
          console.error('Redis delete error:', error)
          const memoryStore = new MemoryStore()
          await memoryStore.delete(key)
        }
      }
    }
  } catch (error) {
    console.error('Redis connection failed, using memory store:', error)
    store = new MemoryStore()
  }
} else {
  // Memory store para desarrollo
  console.log('Using memory store for rate limiting')
  store = new MemoryStore()
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
      console.log(`🔄 RateLimit: incrementAttempt para IP: ${identifier}`);
      
      const now = Date.now()
      const blockKey = `block:${identifier}`
      const attemptKey = `attempt:${identifier}`

      // Verificar si está bloqueado
      const blockInfo = await store.get(blockKey)
      if (blockInfo) {
        console.log(`🚫 IP ${identifier} ya está bloqueada`);
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
      console.log(`📈 IP ${identifier}: intento ${attemptInfo.count} de ${this.config.maxAttempts}`);

      if (attemptInfo.count >= this.config.maxAttempts) {
        console.log(`🔒 Bloqueando IP ${identifier} por demasiados intentos`);
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

      if (store.delete) {
        await store.delete(attemptKey)
        await store.delete(blockKey)
      } else {
        // Para Memory Store sin método delete
        const memoryStore = store as MemoryStore
        await memoryStore.delete(attemptKey)
        await memoryStore.delete(blockKey)
      }

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