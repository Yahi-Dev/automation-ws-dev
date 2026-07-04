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

- Gestión de contactos (CRUD, país, import CSV, validación de número sin envío)
- Consentimiento opt-in/opt-out (STOP/BAJA entrante) con auditoría y gate en el envío
- Plantillas de WhatsApp con estado de aprobación
- Campañas (posts) con envío por lotes, control de velocidad y tracking por mensaje
- Reportes: enviados/entregados/leídos/fallidos, filtros y desglose por campaña
- Configuración segura de credenciales (cifradas en DB)
- Registro con aprobación de administrador

## Requisitos

- Node.js 20+
- MySQL en ejecución
- (Opcional) Upstash Redis, SMTP, cuenta de Twilio

## Puesta en marcha

```bash
npm install
# 1) Configura el .env (ver más abajo)
# 2) Aplica migraciones
npx prisma migrate deploy   # o: npx prisma migrate dev
# 3) Siembra usuarios (opcional)
npm run db:seed
# 4) Arranca
npm run dev                 # http://localhost:3000
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

## Scripts

- `npm run dev` — desarrollo
- `npm run build` / `npm start` — producción
- `npm run db:seed` — siembra usuarios (usa `SEED_USERS`)
- `npm run db:reset` — reinicia la DB y siembra

## Webhooks de Twilio

Configura en la consola de Twilio (WhatsApp sender):

- **Status callback** → `https://TU_DOMINIO/api/whatsapp/webhook?token=SECRETO`
- **A message comes in** (entrantes / STOP) → `https://TU_DOMINIO/api/whatsapp/inbound?token=SECRETO`

En desarrollo usa un túnel (ngrok) y pon esa URL en `WHATSAPP_WEBHOOK_BASE_URL`.

## Envío programado (cron)

Llama periódicamente a `POST /api/whatsapp/dispatch?token=CRON_SECRET` (por ejemplo con Vercel Cron) para despachar las campañas cuya fecha ya venció.

## Notas de producción

- Usa un **sender de WhatsApp aprobado** (no el sandbox) en `TWILIO_WHATSAPP_FROM`.
- Activa `TWILIO_VALIDATE_SIGNATURE=true` y sirve por HTTPS.
- Define un `SETTINGS_ENC_KEY` dedicado y **rota** cualquier secreto que haya estado en el repositorio.
- El primer usuario administrador se crea sembrando o promoviendo el rol en la tabla `user`.
