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
};

export default nextConfig;
