// app/(authenticated)/layout.tsx
import { AppSidebar } from "@/src/components/app-sidebar";
import { SiteHeader } from "@/src/components/site-header";
import { SidebarInset, SidebarProvider } from "@/src/components/ui/sidebar";
import { auth } from "@/src/lib/auth";
import redis from "@/src/lib/redis";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type React from "react";

export default async function AuthenticatedLayout({children,}: {children: React.ReactNode}) {
  // 1) Sesión server-side (manteniendo tu forma con headers())
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  // 3) (Opcional) Refrescar caché para el middleware (edge)
  // Si better-auth expone el token de sesión, lo cacheamos.
  const token = session.session?.token as string | undefined;
  if (token) {
    // Cachea el estado de sesión para el middleware (TTL largo, se renueva en cada visita).
    // El cliente `redis` es resiliente: si Upstash no está disponible, no falla.
    await redis.set(`sess_status:${token}`, "approved", { ex: 60 * 60 * 24 * 30 });
  }

  // 4) Tu layout original intacto
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
