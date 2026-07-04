// app/(authenticated)/layout.tsx
import { AppSidebar } from "@/src/components/app-sidebar";
import { SiteHeader } from "@/src/components/site-header";
import { SidebarInset, SidebarProvider } from "@/src/components/ui/sidebar";
import { auth } from "@/src/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type React from "react";

export default async function AuthenticatedLayout({children,}: {children: React.ReactNode}) {
  // Sesión server-side
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  // Gate de aprobación: solo usuarios aprobados entran.
  const status = (session.user as { status?: string }).status;
  if (status && status !== "approved") redirect("/login?pending=1");

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        user={{
          name: session.user.name ?? "",
          email: session.user.email ?? "",
          avatar: session.user.image ?? "",
          role: (session.user as { role?: string }).role ?? "user",
        }}
      />
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
