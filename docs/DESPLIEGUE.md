# Despliegue y operación

Guía para poner `automation-ws` en producción y mantenerlo. Está escrita para
una sola máquina con Docker Compose, que es lo que necesita este proyecto y lo
que cuesta menos operar.

---

## 1. Por qué una máquina y no un PaaS gratuito

La app necesita un **proceso Node persistente**: el worker mantiene conexiones
bloqueantes contra Redis (BullMQ) y ejecuta un trabajo repetible cada 60 s. Eso
descarta la mayoría de niveles gratuitos:

| Plataforma | Por qué no sirve |
|---|---|
| Vercel | No hay proceso persistente. El worker no tiene dónde vivir. |
| Render (free) | Duerme a los 15 min de inactividad: las campañas programadas dejan de despacharse. |
| Koyeb (free) | Prohíbe explícitamente los *Worker Services*. |
| Neon (free) | La base de datos se suspende a los 5 min; el worker reconecta en mitad de cada campaña. |
| Supabase (free) | Pausa el proyecto tras 7 días de inactividad. |

**Opciones válidas**, en orden de recomendación:

1. **VPS de pago pequeño** (Hetzner CX22 ≈ 4,35 €/mes, o similar). Sin sorpresas,
   sin límites de conexiones, MySQL y Redis incluidos en la misma máquina.
2. **Oracle Cloud Always Free** (2 OCPU / 12 GB ARM). Cuesta 0, pero:
   - no tiene SLA;
   - Oracle recupera instancias con CPU p95 < 20 % durante 7 días;
   - el nivel gratuito ya se recortó unilateralmente en junio de 2026.

   Es viable, y son riesgos que conviene dejar por escrito con el cliente antes
   de elegirlo.

Servicios complementarios gratuitos que sí encajan: **Cloudflare** (DNS, TLS,
WAF), **Cloudflare R2** (almacenamiento de imágenes), **Brevo** (300 correos/día
por SMTP, compatible con nodemailer sin tocar código), **Sentry** y **GitHub
Actions**. No hace falta cron externo: el despachador vive dentro del worker.

---

## 2. Puesta en marcha

### 2.1 Preparar la máquina

```bash
# Usuario sin privilegios, cortafuegos y actualizaciones automáticas
adduser deploy && usermod -aG sudo deploy
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable
apt install -y unattended-upgrades fail2ban

# Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

### 2.2 Configurar

```bash
git clone <repo> automation-ws && cd automation-ws
cp .env.example .env
```

Rellenar `.env`. **Antes de arrancar**, generar los secretos:

```bash
openssl rand -hex 32   # BETTER_AUTH_SECRET
openssl rand -hex 32   # SETTINGS_ENC_KEY
openssl rand -hex 24   # WHATSAPP_WEBHOOK_SECRET
openssl rand -hex 24   # CRON_SECRET
```

> **`SETTINGS_ENC_KEY` hay que fijarla ANTES de guardar credenciales de Twilio.**
> Si falta, la clave se deriva de `BETTER_AUTH_SECRET`; rotar ese secreto después
> vuelve **ilegibles** los secretos ya guardados en la base de datos.

Variables que definen el comportamiento y suelen olvidarse:

| Variable | Qué pasa si no se define |
|---|---|
| `REDIS_URL` | No hay cola ni worker: el envío ocurre dentro del request y **las campañas programadas nunca se disparan**. |
| `TRUST_PLATFORM_HEADERS` / `TRUSTED_PROXY_HOPS` | La app no puede resolver la IP del cliente y **bloquea los intentos de login** (fallo cerrado, a propósito). Con el compose de este repo: `TRUSTED_PROXY_HOPS=1`; añade Cloudflare delante y pasa a `2` con `TRUST_PLATFORM_HEADERS=true`. |
| `WHATSAPP_WEBHOOK_BASE_URL` | Twilio no puede entregar los estados: los mensajes se quedan en `sent` para siempre. |
| `BOOTSTRAP_ADMIN_EMAIL` | No hay forma de crear el primer administrador sin tocar MySQL a mano. |

### 2.3 Arrancar

```bash
docker compose up -d --build
docker compose ps          # los 5 servicios deben estar healthy
```

Las migraciones se aplican solas al arrancar el contenedor `app`.

### 2.4 Primer administrador

Regístrate en `https://TU_DOMINIO/registro`, pon ese correo en
`BOOTSTRAP_ADMIN_EMAIL` y ejecuta:

```bash
docker compose exec app npx tsx src/seed/bootstrap-admin.ts
```

Es idempotente: si ya existe algún administrador aprobado, no hace nada.

### 2.5 Webhooks de Twilio

En la consola de Twilio, sobre el sender de WhatsApp:

- **Status callback** → `https://TU_DOMINIO/api/whatsapp/webhook?token=WHATSAPP_WEBHOOK_SECRET`
- **A message comes in** → `https://TU_DOMINIO/api/whatsapp/inbound?token=WHATSAPP_WEBHOOK_SECRET`

Deja `TWILIO_VALIDATE_SIGNATURE=true` (es el valor por defecto). Solo el valor
literal `"false"` desactiva la verificación de firma.

---

## 3. Comprobación de que funciona

```bash
# 1. Salud (desde dentro: el endpoint está bloqueado al exterior por Caddy)
docker compose exec app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.json()).then(console.log)"

# 2. El worker registró el trabajo repetible
docker compose logs worker | grep "listo"

# 3. Estado de las colas
curl "https://TU_DOMINIO/api/metrics/queues?token=CRON_SECRET"
```

Prueba de extremo a extremo:

1. Importar un CSV declarando el origen del consentimiento.
2. Crear una campaña programada a +2 minutos.
3. Asignarle contactos en `/messages/assign`.
4. Esperar. El worker debe despacharla **sin que nadie toque la interfaz**.
5. Los estados deben avanzar a `delivered` por el webhook.

---

## 4. Operación

### Reiniciar sin perder mensajes

```bash
docker compose restart worker
```

El cierre ordenado espera `WORKER_SHUTDOWN_TIMEOUT_MS` (25 s) y `stop_grace_period`
son 40 s, así que hay margen. Un mensaje que quede a medias vuelve a estar
disponible a los 90 s por el mecanismo de recuperación de `queued` colgados.

### Copias de seguridad

```bash
# Volcado cifrado
docker compose exec -T mysql mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" \
  --single-transaction --routines automation_ws \
  | gzip | openssl enc -aes-256-cbc -pbkdf2 -pass pass:"$BACKUP_KEY" \
  > backup-$(date +%F).sql.gz.enc
```

> Una copia que no se ha restaurado nunca no es una copia. Prueba la
> restauración en una máquina limpia al menos una vez.

### Rotar credenciales de Twilio

Desde **Configuración** en la propia app. La caché del cliente se invalida sola;
no hace falta reiniciar nada.

### Ver por qué falló una campaña

```sql
SELECT status, errorCode, COUNT(*)
  FROM message WHERE postId = ? GROUP BY status, errorCode;
```

Códigos propios: `CONSENT_OPT_OUT` (se dio de baja), `CONSENT_NOT_OPTED_IN` (no
consta su opt-in), `PHONE_INVALID` (formato). Los tres son **definitivos**: no
se reintentan y no consumen crédito.

---

## 5. Límites que no dependen del código

**El cuello de botella no es la aplicación, es WhatsApp.** Un número nuevo empieza
en **250 destinatarios únicos cada 24 h**, y sube a 1.000 → 10.000 → 100.000
según el volumen y la calificación de calidad.

Consecuencias prácticas:

- Difundir a 20.000 contactos el primer día es **imposible**, y forzarlo degrada
  la calificación hasta que Meta bloquea el número.
- Hay que **calentar** el número: empezar por debajo del límite y subir a lo
  largo de semanas.
- Ajusta `WHATSAPP_DAILY_QUOTA` (si lo implementas) o el volumen de las campañas
  al tier real del momento.

Los mensajes **cuestan dinero** y se facturan aparte del alojamiento. A partir
de unos miles de mensajes al mes, la infraestructura es ruido frente al coste de
los mensajes: por eso conviene gastar en un servidor que no duerma antes que
optimizar céntimos de alojamiento.
