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

      // Cada llamada a sendPostMessages procesa como mucho WHATSAPP_MAX_PER_RUN
      // mensajes (tope que evita hidratar la campana entera en memoria). Se
      // itera aqui hasta agotarla, en vez de lanzar para que BullMQ reintente:
      // lanzar consumiria los `attempts` del job, y una campana de 10.000
      // mensajes necesita 20 pasadas, muchas mas que los 5 reintentos
      // configurados. Los `attempts` quedan asi para fallos de verdad.
      const MAX_PASADAS = Math.max(1, Number(process.env.WORKER_MAX_PASADAS ?? 200));

      let acumulado = { total: 0, sent: 0, failed: 0 };
      let ultimo: Awaited<ReturnType<typeof sendPostMessages>> | null = null;

      for (let pasada = 0; pasada < MAX_PASADAS; pasada++) {
        const outcome = await sendPostMessages(postId, actor, { batchSize, delayMs, includeSent });
        ultimo = outcome;

        if (!outcome.ok) break;

        acumulado = {
          total: acumulado.total + outcome.total,
          sent: acumulado.sent + outcome.sent,
          failed: acumulado.failed + outcome.failed,
        };

        // El circuito de Twilio esta abierto: no tiene sentido seguir dando
        // pasadas. Se lanza para que BullMQ reintente con backoff exponencial.
        // Antes esto salia por `break` devolviendo { ok: true }, y BullMQ
        // marcaba como COMPLETADO un job que habia enviado 5 de 50.000.
        if (outcome.cortadoPorBreaker) {
          throw new Error(
            `Campana ${postId} interrumpida: el circuito de Twilio esta abierto. Reintento programado.`
          );
        }

        if (outcome.pendientesRestantes === 0) break;
      }

      return { postId, ...acumulado, ultimo: ultimo?.ok ? undefined : ultimo };
    },
    {
      connection,
      concurrency: campaignConcurrency,
      // El job de campana itera por lotes y puede durar minutos. El lock por
      // defecto de BullMQ son 30 s: si se supera sin renovar, el job se declara
      // "stalled" y se redespacha A OTRO WORKER mientras el original sigue
      // enviando. Con 5 minutos hay margen de sobra entre renovaciones.
      lockDuration: 300_000,
      maxStalledCount: 1,
    }
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

  // Cierre ordenado.
  //
  // `close()` sin argumento espera a que TERMINEN los jobs activos. Con una
  // campaña larga eso podía superar el periodo de gracia del orquestador
  // (30 s en Kubernetes, 10 s en `docker stop`), que entonces manda SIGKILL.
  // Y un SIGKILL entre `messages.create` y el UPDATE a "sent" deja el mensaje
  // en `queued` sin providerSid: a los 90 s se re-reclama y SE ENVÍA DOS VECES.
  //
  // Por eso: se pide cierre suave, y si no termina dentro del plazo se fuerza
  // (`close(true)`) para al menos cerrar limpiamente las conexiones de Redis
  // antes de que llegue el SIGKILL.
  const GRACIA_MS = Math.max(1_000, Number(process.env.WORKER_SHUTDOWN_TIMEOUT_MS ?? 25_000));
  let cerrando = false;

  const shutdown = async (signal: string) => {
    if (cerrando) return;
    cerrando = true;

    console.log(`[worker] ${signal} recibido, cerrando (máx. ${GRACIA_MS} ms)...`);

    const workers = [campaignWorker, webhookWorker, dispatchWorker];
    const suave = Promise.allSettled(workers.map((w) => w.close()));
    const plazo = new Promise<"timeout">((r) => setTimeout(() => r("timeout"), GRACIA_MS));

    const resultado = await Promise.race([suave.then(() => "ok" as const), plazo]);

    if (resultado === "timeout") {
      console.warn(
        "[worker] los jobs activos no terminaron a tiempo; cierre forzado. " +
          "Los mensajes en vuelo se recuperarán por el mecanismo de 'queued' colgados."
      );
      await Promise.allSettled(workers.map((w) => w.close(true)));
    }

    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[worker] fallo fatal:", err);
  process.exit(1);
});
