// src/lib/logger.ts
// Logging estructurado (pino) + captura de errores opcional en Sentry.
// Solo servidor. Sentry se inicializa únicamente si SENTRY_DSN está definida.
import pino from "pino";
import * as Sentry from "@sentry/node";

const SENTRY_DSN = process.env.SENTRY_DSN || "";
let sentryReady = false;
if (SENTRY_DSN) {
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    });
    sentryReady = true;
  } catch {
    // Si falla la init, seguimos solo con logs.
  }
}

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: { service: process.env.SERVICE_NAME || "automation-ws" },
});

/** Registra un error de forma estructurada y, si Sentry está activo, lo reporta. */
export function captureError(err: unknown, context?: Record<string, unknown>) {
  const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err));
  logger.error({ err: e, ...context }, e.message);
  if (sentryReady) {
    try {
      Sentry.captureException(e, context ? { extra: context } : undefined);
    } catch {
      // no romper el flujo por un fallo del reporter
    }
  }
}

export const sentryEnabled = () => sentryReady;
