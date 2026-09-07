import type { NextConfig } from "next";

// Si hay object storage público configurado (F5), permitimos su host en next/image.
function s3RemotePattern() {
  const base = process.env.S3_PUBLIC_BASE_URL;
  if (!base) return [];
  try {
    const u = new URL(base);
    return [{ protocol: (u.protocol.replace(":", "") as "https" | "http"), hostname: u.hostname, port: u.port || "", pathname: "/**" }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  // Empaquetado autocontenido: `next build` deja en .next/standalone un
  // server.js con solo las dependencias que se usan de verdad. Es lo que
  // permite una imagen de Docker pequena sin copiar node_modules entero.
  output: "standalone",

  // Paquetes solo de servidor (Node): que el bundler no intente empaquetarlos.
  // exceljs (lector de .xlsx al importar contactos) es CommonJS y hace
  // `require` dinamicos de modulos de Node: se deja fuera del bundle igual que
  // el resto de paquetes de servidor.
  serverExternalPackages: ["bullmq", "ioredis", "pino", "@sentry/node", "exceljs"],
  images: {
    remotePatterns: [
      ...s3RemotePattern(),
      // Cloudinary: donde viven las imagenes de las campanas en produccion.
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "https",
        hostname: "shutterstock.com",
      },
      {
        protocol: 'https',
        hostname: 'fakeimg.pl',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Headers de seguridad (no afectan el render). CSP conservadora: solo directivas
  // que no rompen los scripts/estilos inline de Next (frame-ancestors, base-uri,
  // object-src, form-action). nosniff endurece además los archivos servidos (uploads).
  async headers() {
    const csp = [
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
