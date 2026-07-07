// src/lib/queue.ts
// Cola de trabajos (BullMQ sobre Redis TCP) para sacar el envío del request y
// procesar volumen alto con reintentos + backoff + DLQ.
//
// GATED por REDIS_URL: si no está definida, `queueEnabled` es false y la app
// sigue funcionando en modo SÍNCRONO (fallback), igual que antes. En cuanto se
// define REDIS_URL y se levanta el proceso worker (`npm run worker`), el envío
// pasa a ser asíncrono y elástico. Mismo principio resiliente que src/lib/redis.ts.
import { Queue, type ConnectionOptions, type JobsOptions } from "bullmq";

const REDIS_URL = process.env.REDIS_URL || process.env.BULLMQ_REDIS_URL || "";

/** ¿Hay Redis TCP configurado para BullMQ? (no vacío y no placeholder) */
export const queueEnabled = Boolean(REDIS_URL && !/XXXX|your-|example|changeme/i.test(REDIS_URL));

export const QUEUE_NAMES = {
  campaignSend: "campaign-send",
  webhookIngest: "webhook-ingest",
  scheduledDispatch: "scheduled-dispatch",
} as const;

// Opciones de conexión derivadas de REDIS_URL. Dejamos que BullMQ cree la conexión
// con su propia copia de ioredis (evita choque de tipos por doble instalación).
// BullMQ exige maxRetriesPerRequest: null para los workers (comandos bloqueantes).
let cachedConn: ConnectionOptions | null = null;
export function getConnectionOptions(): ConnectionOptions | null {
  if (!queueEnabled) return null;
  if (cachedConn) return cachedConn;
  const u = new URL(REDIS_URL);
  cachedConn = {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...(u.protocol === "rediss:" ? { tls: {} } : {}),
  };
  return cachedConn;
}

const DEFAULT_JOB_OPTS: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 5_000 },
  removeOnComplete: { count: 1_000, age: 24 * 3600 },
  removeOnFail: { age: 7 * 24 * 3600 }, // se conservan 7 días para inspección (DLQ ligera)
};

const queues = new Map<string, Queue>();
function getQueue(name: string): Queue | null {
  const connection = getConnectionOptions();
  if (!connection) return null;
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection, defaultJobOptions: DEFAULT_JOB_OPTS });
    queues.set(name, q);
  }
  return q;
}

export function getCampaignQueue(): Queue | null {
  return getQueue(QUEUE_NAMES.campaignSend);
}
export function getWebhookQueue(): Queue | null {
  return getQueue(QUEUE_NAMES.webhookIngest);
}
export function getDispatchQueue(): Queue | null {
  return getQueue(QUEUE_NAMES.scheduledDispatch);
}

// ---------------------------------------------------------------------------
// Tipos de payload de los jobs
// ---------------------------------------------------------------------------
export type CampaignJobData = {
  postId: number;
  actor: string;
  batchSize?: number;
  delayMs?: number;
  includeSent?: boolean;
};

export type WebhookJobData = {
  messageSid: string;
  rawStatus: string;
  errorCode: string | null;
  receivedAt: string;
};

// ---------------------------------------------------------------------------
// Encolado (devuelve null si la cola no está habilitada → el caller hace fallback)
// ---------------------------------------------------------------------------
export async function enqueueCampaign(data: CampaignJobData): Promise<string | null> {
  const q = getCampaignQueue();
  if (!q) return null;
  const job = await q.add("send", data, {
    // jobId único por disparo (permite reintentos internos sin colisionar).
    jobId: `campaign:${data.postId}:${Date.now()}`,
  });
  return job.id ?? null;
}

export async function enqueueWebhookEvent(data: WebhookJobData): Promise<string | null> {
  const q = getWebhookQueue();
  if (!q) return null;
  // Idempotencia: mismo (sid,status) colapsa callbacks duplicados de Twilio
  // mientras el job siga en Redis.
  const job = await q.add("status", data, { jobId: `wh:${data.messageSid}:${data.rawStatus}` });
  return job.id ?? null;
}

/** Registra el job repetible de dispatch (cada minuto). Idempotente. */
export async function ensureRepeatableDispatch(): Promise<void> {
  const q = getDispatchQueue();
  if (!q) return;
  await q.add(
    "scan",
    {},
    {
      repeat: { every: 60_000 },
      jobId: "scheduled-dispatch",
      removeOnComplete: true,
      removeOnFail: { age: 3600 },
    }
  );
}
