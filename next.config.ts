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
  // Paquetes solo de servidor (Node): que el bundler no intente empaquetarlos.
  serverExternalPackages: ["bullmq", "ioredis", "pino", "@sentry/node"],
  images: {
    remotePatterns: [
      ...s3RemotePattern(),
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
