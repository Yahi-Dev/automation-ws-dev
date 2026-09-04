# Imagen de la APLICACIÓN WEB (Next.js).
# El worker usa Dockerfile.worker: son dos procesos distintos del mismo repo.
#
# Build multi-etapa: la imagen final solo lleva el runtime, no las herramientas
# de compilación ni node_modules completo (gracias a `output: "standalone"`).

# ---------- 1. Dependencias ----------
FROM node:22-alpine AS deps
WORKDIR /app

# Solo los manifiestos: así esta capa se cachea y no se reinstala en cada cambio
# de código, únicamente cuando cambian las dependencias.
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 2. Build ----------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `prisma generate` antes del build: el cliente generado se importa en tiempo de
# compilación. (El script `build` del package.json ya lo hace, pero explicitarlo
# aquí evita depender de ese detalle.)
RUN npx prisma generate
RUN npm run build

# ---------- 3. Runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Usuario sin privilegios: si alguien consigue ejecución en el contenedor, no
# la consigue como root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Salida standalone: server.js + solo las dependencias realmente usadas.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma: el esquema y las migraciones se necesitan en runtime para poder
# ejecutar `prisma migrate deploy` al arrancar.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin

# Directorio de uploads cuando NO hay S3/R2 configurado. Debe ir montado como
# volumen: dentro de la imagen no es duradero.
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"

# Las migraciones se aplican en el arranque. Antes era un paso manual y `npm run
# build` no las ejecutaba: era fácil desplegar código nuevo contra un esquema viejo.
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
