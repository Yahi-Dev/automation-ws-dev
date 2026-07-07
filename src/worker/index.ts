// src/worker/index.ts
// Proceso worker (segundo servicio del mismo repo): consume las colas BullMQ.
// Arranque:  npm run worker
// Requiere REDIS_URL (TCP) y las mismas variables de entorno que la app.
//
// Colas:
//  - campaign-send     : envía una campaña por lotes (concurrencia + reintentos + backoff)
//  - webhook-ingest    : aplica estados de Twilio (delivered/read/failed) de forma diferida
//  - scheduled-dispatch: job repetible que encola las campañas programadas vencidas
import { loadEnvConfig } from "@next/env";
// Carga .env / .env.local igual que Next (tsx no lo hace solo).
loadEnvConfig(process.cwd());

import { Worker, type Job } from "bullmq";
import {
  getConnectionOptions,
  queueEnabled,
  QUEUE_NAMES,
  ensureRepeatableDispatch,
  type CampaignJobData,
  type WebhookJobData,
} from "../lib/queue";
import { sendPostMessages } from "../lib/campaign-send";
import { applyWebhookStatus } from "../lib/webhook-ingest";
import { dispatchDue } from "../lib/dispatch";
import { recomputeDailyStats } from "../lib/rollups";
import { captureError, logger } from "../lib/logger";

async function main() {
  if (!queueEnabled) {
    console.error(
      "[worker] REDIS_URL no está definida. Define REDIS_URL (Redis TCP) para habilitar la cola.\n" +
        "         Mientras tanto la app funciona en modo síncrono sin worker."
    );
    process.exit(1);
  }

  const connection = getConnectionOptions()!;
  const campaignConcurrency = Number(process.env.WORKER_CAMPAIGN_CONCURRENCY ?? 5);
  const webhookConcurrency = Number(process.env.WORKER_WEBHOOK_CONCURRENCY ?? 20);

  // --- campaign-send ---
  const campaignWorker = new Worker<CampaignJobData>(
    QUEUE_NAMES.campaignSend,
    async (job: Job<CampaignJobData>) => {
      const { postId, actor, batchSize, delayMs, includeSent } = job.data;
      const outcome = await sendPostMessages(postId, actor, { batchSize, delayMs, includeSent });
      return outcome;
    },
    { connection, concurrency: campaignConcurrency }
  );

  // --- webhook-ingest ---
  const webhookWorker = new Worker<WebhookJobData>(
    QUEUE_NAMES.webhookIngest,
    async (job: Job<WebhookJobData>) => {
      const { messageSid, rawStatus, errorCode } = job.data;
      return applyWebhookStatus({ messageSid, rawStatus, errorCode });
    },
    { connection, concurrency: webhookConcurrency }
  );

  // --- scheduled-dispatch (repetible cada minuto): despacha vencidas + refresca rollups ---
  const dispatchWorker = new Worker(
    QUEUE_NAMES.scheduledDispatch,
    async () => {
      const result = await dispatchDue("cron");
      if (result.dispatched > 0) console.log(`[worker] dispatch: ${result.dispatched} campaña(s) encolada(s)`);
      // Rollup del dashboard (F4): recomputa los últimos días para lecturas O(1).
      await recomputeDailyStats(8).catch((e) => console.warn("[worker] rollup falló:", e?.message ?? e));
      return result;
    },
    { connection, concurrency: 1 }
  );

  for (const [name, w] of [
    ["campaign-send", campaignWorker],
    ["webhook-ingest", webhookWorker],
    ["scheduled-dispatch", dispatchWorker],
  ] as const) {
    w.on("failed", (job, err) => captureError(err, { worker: name, jobId: job?.id }));
    w.on("error", (err) => captureError(err, { worker: name, event: "error" }));
  }

  await ensureRepeatableDispatch();

  logger.info(
    { campaignConcurrency, webhookConcurrency },
    "[worker] listo. Dispatch + rollup cada 60s."
  );

  // Cierre ordenado
  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} recibido, cerrando...`);
    // Cada worker cierra su propia conexión de Redis (BullMQ las gestiona).
    await Promise.allSettled([campaignWorker.close(), webhookWorker.close(), dispatchWorker.close()]);
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[worker] fallo fatal:", err);
  process.exit(1);
});
