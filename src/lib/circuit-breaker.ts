// src/lib/circuit-breaker.ts
// Circuit breaker genérico (mismo patrón que el fallback de src/lib/redis.ts).
// Tras `threshold` fallos seguidos abre el circuito por `cooldownMs`: durante ese
// tiempo `exec` falla rápido sin llamar al servicio, evitando martillar un
// proveedor caído (Twilio) y liberando recursos. Un éxito reinicia el contador.
export class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;
  private readonly threshold: number;
  private readonly cooldownMs: number;
  readonly name: string;

  constructor(opts?: { threshold?: number; cooldownMs?: number; name?: string }) {
    this.threshold = opts?.threshold ?? 5;
    this.cooldownMs = opts?.cooldownMs ?? 30_000;
    this.name = opts?.name ?? "circuit";
  }

  isOpen(): boolean {
    return Date.now() < this.openUntil;
  }

  private onSuccess() {
    this.failures = 0;
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.openUntil = Date.now() + this.cooldownMs;
      this.failures = 0;
    }
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      const err = new Error(`Circuit "${this.name}" abierto`) as Error & { circuitOpen?: boolean };
      err.circuitOpen = true;
      throw err;
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (e) {
      this.onFailure();
      throw e;
    }
  }
}
