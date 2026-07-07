import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // bullmq/ioredis son solo de servidor (Node): que el bundler no intente empaquetarlos.
  serverExternalPackages: ["bullmq", "ioredis"],
  images: {
    remotePatterns: [
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
