# Escalabilidad y rendimiento (backend)

Este documento resume los cambios de escalabilidad (F0–F7) aplicados al backend
**sin tocar la capa visual**, y qué se necesita para activarlos en producción.

Principio transversal: **todo degrada con elegancia**. Si una pieza de infra no
está configurada (Redis, cola, bucket, réplica), la app sigue funcionando en su
modo previo. Al definir las variables de entorno correspondientes, se activa el
camino escalable — sin cambios de código ni de UI.

---

## Cómo correr

```bash
# App web (servidor persistente Node; NO serverless)
npm run build && npm start

# Worker (segundo servicio del mismo repo) — requiere REDIS_URL
npm run worker
# desarrollo con recarga:
npm run worker:dev
```

- La **app** atiende requests y, si hay cola, encola trabajos.
- El **worker** procesa las colas: envío de campañas, ingesta de webhooks,
  dispatch programado y refresco de rollups. Escala horizontalmente
  (varias réplicas del worker).

---

## Variables de entorno

### Base (ya existentes)
- `DATABASE_URL` — MySQL.
- `TWILIO_*` / `WHATSAPP_*` — credenciales y preferencias de envío (o vía tabla `app_settings`).

### F1 — Redis / caché / sesiones
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — caché, rate-limit y sesiones
  (cliente REST resiliente con fallback en memoria). Opcional pero recomendado.

### F2 — Cola (BullMQ)
- `REDIS_URL` — **Redis TCP** (`redis://` o `rediss://`). Es lo que habilita la cola
  y el worker. Sin esto, el envío es síncrono dentro del request (modo previo).
- `WORKER_CAMPAIGN_CONCURRENCY` (def. 5), `WORKER_WEBHOOK_CONCURRENCY` (def. 20).
- `TWILIO_MESSAGING_SERVICE_SID` (o en `app_settings`) — si está, se envía a través
  del Messaging Service (rate-limit por carrier).

> Nota: Upstash ofrece endpoint TCP (`rediss://`) además del REST; se puede usar el
> mismo Upstash para F1 (REST) y F2 (TCP).

### F3 — Pooling de conexiones
- `DB_CONNECTION_LIMIT` — conexiones máx. del pool por proceso (ej. 10).
- `DB_POOL_TIMEOUT` — segundos de espera por conexión.
- Regla: `sum(connection_limit de TODAS las instancias + workers) < max_connections` de MySQL.
- Para pooling gestionado: apuntar `DATABASE_URL` a Prisma Accelerate (`prisma://`),
  PlanetScale o un PgBouncer/ProxySQL (en ese caso no se anexan estos parámetros).

### F5 — Object storage (uploads)
- `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — requeridas para activar.
- `S3_REGION` (def. `auto`), `S3_ENDPOINT` (R2: `https://<accountid>.r2.cloudflarestorage.com`),
  `S3_PUBLIC_BASE_URL` (base pública/CDN para servir), `S3_FORCE_PATH_STYLE`.
- Sin esto, los uploads van a `public/uploads` (mono-instancia).

### F6 — Observabilidad / resiliencia
- `SENTRY_DSN` (+ `SENTRY_TRACES_SAMPLE_RATE`) — reporte de errores (opcional).
- `LOG_LEVEL` (def. info en prod), `SERVICE_NAME`.
- `TWILIO_BREAKER_THRESHOLD` (def. 5), `TWILIO_BREAKER_COOLDOWN_MS` (def. 30000).
- Health check: `GET /api/health` → `ok | degraded | down` (503 si la DB cae).

### F7 — Volumen extremo
- `DATABASE_REPLICA_URL` — réplica de lectura; las lecturas pesadas (dashboard,
  rollups) la usan automáticamente. Sin esto, leen del primario.
- Métricas de cola para autoescalado: `GET /api/metrics/queues?token=CRON_SECRET`.

### Cron
- `CRON_SECRET` — protege `/api/whatsapp/dispatch` y `/api/metrics/queues`.

---

## Resumen por fase

| Fase | Qué resuelve | Estado |
|------|--------------|--------|
| F0 | Índices + constraints únicos, dedup, paginación keyset acotada, batching de import | Código + migración |
| F1 | Rate-limit distribuido, cache-aside versionado, sesiones en Redis | Código (usa Upstash si está) |
| F2 | Cola + workers: envío asíncrono con reintentos/backoff/DLQ, webhook diferido, dispatch, idempotencia, Messaging Service | Código (requiere `REDIS_URL` para activar) |
| F3 | Pooling configurable por proceso | Código |
| F4 | Rollup diario del dashboard (lecturas O(1)) | Código + migración |
| F5 | Uploads a S3/R2 | Código (requiere bucket para activar) |
| F6 | Logs (pino), Sentry gated, circuit breaker (Twilio), `/api/health` | Código |
| F7 | Réplica de lectura, métricas de cola; runbooks de Kafka/particionado/búsqueda | Código + runbooks |

---

## Runbooks F7 (infra pesada, según volumen real)

### Réplica de lectura
1. Crear una réplica de MySQL (o usar PlanetScale/managed).
2. Definir `DATABASE_REPLICA_URL`. Listo: dashboard y rollups leen de la réplica.

### Autoescalado de workers por profundidad de cola
- Exponer `GET /api/metrics/queues?token=$CRON_SECRET`.
- En Kubernetes: HPA con métrica externa = `waiting + active` de `campaign-send`.
  Escalar réplicas del `Deployment` del worker (cada réplica corre `npm run worker`).

### Particionado de `message` por fecha (MySQL)
- Requiere que la columna de partición forme parte de **todas** las claves únicas.
  Hoy `message` tiene PK `id` y único `(postId, contactId)`; particionar por fecha
  exige rediseñar esas claves (p. ej. PK compuesta con `createdAt`). Es un cambio
  con impacto; hacerlo como migración dedicada y con ventana de mantenimiento.
- Alternativa gestionada: mover el histórico de eventos a ClickHouse (ver abajo).

### Kafka / ClickHouse (pipeline de eventos a alto volumen)
- Publicar eventos de mensaje (sent/delivered/read/failed) a Kafka (Confluent Cloud)
  desde el worker (patrón Outbox: escribir evento + estado en la misma transacción,
  publicar aparte).
- Consumidores materializan agregados en ClickHouse; el dashboard/reportes leen de ahí.
- El punto de integración natural es `src/lib/webhook-ingest.ts` y `src/lib/campaign-send.ts`.

### Búsqueda dedicada de contactos (Meilisearch/Typesense)
- Hoy la búsqueda usa `LIKE %texto%` (no usa índice para infijos).
- Indexar contactos en Meilisearch/Typesense y sustituir la búsqueda del endpoint
  `/api/contacts` por consultas al motor; mantener MySQL como fuente de verdad.

---

## Verificación end-to-end (con cola activa)

1. Definir `REDIS_URL` y levantar `npm run worker`.
2. `GET /api/health` → `ok`.
3. Encolar una campaña grande (`POST /api/whatsapp`) → responde 202 al instante.
4. Ver al worker procesar por lotes; los estados avanzan por el webhook.
5. Simular fallo de Twilio → el breaker abre y los reintentos re-envían tras el cooldown.
6. Dashboard servido desde rollups; `GET /api/metrics/queues` muestra la profundidad.
