# automation-ws

Aplicación web para **envío masivo (broadcast) de WhatsApp** a listas de contactos, sobre **Twilio** (BSP oficial de WhatsApp), cumpliendo las políticas de opt-in/opt-out.

## Stack

- **Next.js 16** (App Router, React 19, Turbopack) + TypeScript
- **Prisma 6 + MySQL**
- **better-auth** (email/password, roles, aprobación de admin)
- **Twilio** (envío de WhatsApp + Content API para plantillas)
- **Upstash Redis** (caché, opcional; con fallback en memoria)
- **shadcn/ui + Tailwind CSS v4**, TanStack Table, Recharts

## Funcionalidades

- Gestión de contactos (CRUD, país, import **CSV y Excel**, validación de número sin envío)
- Consentimiento opt-in/opt-out (STOP/BAJA entrante) con auditoría y gate en el envío
- **Pantalla de consentimiento** (`/consentimiento`): historial completo con filtros y exportación a CSV
- **Bandeja de entrantes** (`/entrantes`): todo mensaje recibido queda registrado, incluso de números desconocidos
- **Manual guiado dentro de la app**: botón «¿Cómo funciona?» en todas las pantallas, con 72 pasos que señalan dónde pulsar (driver.js). Se lanza solo la primera vez que se entra en cada pantalla
- Plantillas de WhatsApp con estado de aprobación
- Campañas (posts) con envío por lotes, control de velocidad y tracking por mensaje
- Reportes: enviados/entregados/leídos/fallidos, filtros y desglose por campaña
- Configuración segura de credenciales (cifradas en DB)
- Registro con aprobación de administrador

## Requisitos

- Node.js 22+
- MySQL en ejecución
- (Opcional) Upstash Redis, SMTP, cuenta de Twilio

## Puesta en marcha

```bash
npm install
# 1) Configura el entorno
cp .env.example .env        # y rellena los valores
# 2) Aplica migraciones
npx prisma migrate deploy   # o: npx prisma migrate dev
# 3) Crea el PRIMER administrador
#    Regístrate en /registro, pon ese correo en BOOTSTRAP_ADMIN_EMAIL y:
npm run db:bootstrap-admin
# 4) Arranca
npm run dev                 # http://localhost:3000
```

> Sin el paso 3 no se puede entrar a `/usuarios` ni a `/configuracion`: tanto el
> registro público como el seeder crean usuarios `pending`/`user`, y el endpoint
> que promueve exige ya ser administrador.

### Verificación

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # Vitest
npm run build       # build de producción
```

## Variables de entorno (`.env`)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión MySQL |
| `BETTER_AUTH_SECRET` | Secreto de better-auth |
| `BETTER_AUTH_URL`, `APP_URL`, `NEXT_PUBLIC_APP_URL` | URL base de la app |
| `MAIL_HOST/PORT/USERNAME/PASSWORD/FROM_*` | SMTP para correos |
| `UPSTASH_REDIS_REST_URL/TOKEN` | Redis (opcional; si falta, usa memoria) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Credenciales de Twilio |
| `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET` | API Key de Twilio (opcional) |
| `TWILIO_WHATSAPP_FROM` | Sender de WhatsApp aprobado (`whatsapp:+...`) |
| `TWILIO_PHONE_NUMBER` | Sender sandbox (`whatsapp:+14155238886`) |
| `TWILIO_CONTENT_BASE_URL`, `TWILIO_TEMPLATE_*` | Content API / plantillas |
| `WHATSAPP_BATCH_SIZE`, `WHATSAPP_SEND_DELAY_MS` | Control de velocidad del envío |
| `WHATSAPP_WEBHOOK_BASE_URL` | URL pública para callbacks de Twilio (ngrok/dominio) |
| `WHATSAPP_WEBHOOK_SECRET` | Secreto compartido del webhook (`?token=`) |
| `WHATSAPP_REQUIRE_OPT_IN` | `true` para exigir opt-in antes de enviar |
| `TWILIO_VALIDATE_SIGNATURE` | `true` para validar la firma de Twilio (producción) |
| `CRON_SECRET` | Token del endpoint de envío programado |
| `SETTINGS_ENC_KEY` | Clave (hex 64) para cifrar secretos de Configuración |
| `SEED_USERS` | JSON de usuarios a sembrar (solo local) |

> La configuración de Twilio también puede administrarse desde la UI (**Configuración**), que guarda los secretos cifrados en la base de datos y tiene prioridad sobre el `.env`.

**La lista completa y comentada de variables está en [`.env.example`](.env.example).**
Tres que suelen olvidarse y rompen cosas en silencio:

| Variable | Qué pasa si falta |
|---|---|
| `SETTINGS_ENC_KEY` | La clave de cifrado se deriva de `BETTER_AUTH_SECRET`; rotar ese secreto vuelve **ilegibles** los secretos ya guardados. Defínela **antes** de guardar credenciales. |
| `TRUST_PLATFORM_HEADERS` / `TRUSTED_PROXY_HOPS` | La app no puede resolver la IP del cliente y **bloquea los intentos de login** (fallo cerrado, deliberado). |
| `REDIS_URL` | No hay cola ni worker: las campañas programadas no se despachan. |

## Scripts

- `npm run dev` — desarrollo
- `npm run build` / `npm start` — producción
- `npm run worker` — proceso worker (colas BullMQ). **Requiere `REDIS_URL`**
- `npm run lint` / `npm run typecheck` / `npm test` — verificación
- `npm run db:seed` — siembra usuarios (usa `SEED_USERS`)
- `npm run db:bootstrap-admin` — promueve `BOOTSTRAP_ADMIN_EMAIL` a admin aprobado
- `npm run db:reset` — reinicia la DB y siembra

## Los dos procesos

| Proceso | Comando | Sin él |
|---|---|---|
| Web | `npm start` | — |
| Worker | `npm run worker` | **Las campañas programadas nunca se disparan** y el envío ocurre dentro del request |

El worker necesita `REDIS_URL` (Redis TCP). El cliente REST de Upstash **no
sirve** para la cola: BullMQ usa comandos de bloqueo.

## Webhooks de Twilio

Configura en la consola de Twilio (WhatsApp sender):

- **Status callback** → `https://TU_DOMINIO/api/whatsapp/webhook?token=SECRETO`
- **A message comes in** (entrantes / STOP) → `https://TU_DOMINIO/api/whatsapp/inbound?token=SECRETO`

En desarrollo usa un túnel (ngrok) y pon esa URL en `WHATSAPP_WEBHOOK_BASE_URL`.

## Envío programado (cron)

Llama periódicamente a `POST /api/whatsapp/dispatch?token=CRON_SECRET` (por ejemplo con Vercel Cron) para despachar las campañas cuya fecha ya venció.

## Despliegue

Ver **[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)**: incluye `docker compose` con
app + worker + MySQL + Redis + TLS automático, y qué alojamiento gratuito sirve
de verdad para esta aplicación (casi ninguno: necesita un proceso persistente).

```bash
cp .env.example .env    # y rellenar
docker compose up -d --build
```

## Notas de producción

- Usa un **sender de WhatsApp aprobado** (no el sandbox) en `TWILIO_WHATSAPP_FROM`.
- Activa `TWILIO_VALIDATE_SIGNATURE=true` y sirve por HTTPS.
- Define un `SETTINGS_ENC_KEY` dedicado y **rota** cualquier secreto que haya estado en el repositorio.
- El primer usuario administrador se crea con `npm run db:bootstrap-admin`.
- **Límite de WhatsApp**: un número nuevo empieza en 250 destinatarios únicos
  cada 24 h y sube por tramos según calidad. No se puede difundir a miles el
  primer día; forzarlo degrada la calificación y Meta puede bloquear el número.
