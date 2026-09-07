// components/app-sidebar.tsx
"use client"

import * as React from "react"
import {
  IconAddressBook,
  IconBrandTelegram,
  IconBrowserShare,
  IconCalendarWeekFilled,
  IconDashboard,
  IconInbox,
  IconSettings,
  IconShieldCheck,
  IconTemplate,
  IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/src/components/nav-main"
import { NavUser } from "@/src/components/nav-user"
import { BotonManual } from "@/src/features/ayuda/components/boton-manual"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/src/components/ui/sidebar"
import { AudioWaveform, Command, GalleryVerticalEnd } from "lucide-react"
import Image from "next/image"
import { FieldSeparator } from "./ui/field"

const data = {
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
    { title: "Contactos", url: "/contacts", icon: IconAddressBook },
    { title: "Posts", url: "/posts", icon: IconBrowserShare },
    { title: "Calendario", url: "/posts/calendar", icon: IconCalendarWeekFilled },
    { title: "Mensajes", url: "/messages", icon: IconBrandTelegram },
    { title: "Entrantes", url: "/entrantes", icon: IconInbox },
    { title: "Consentimiento", url: "/consentimiento", icon: IconShieldCheck },
    { title: "Plantillas", url: "/plantillas", icon: IconTemplate },
  ],
  // Solo para administradores. `Configuración` estaba en el menú general, pero
  // su API exige rol de administrador: quien no lo fuera veía la opción, entraba
  // y se encontraba un formulario que falla al guardar. El manual ya la ocultaba
  // correctamente; el desajuste estaba aquí.
  navAdmin: [
    { title: "Configuración", url: "/configuracion", icon: IconSettings },
    { title: "Usuarios", url: "/usuarios", icon: IconUsers },
  ],
}

type AppSidebarUser = { name: string; email: string; avatar: string; role?: string }

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: AppSidebarUser }) {
  const navMain =
    user.role === "admin" ? [...data.navMain, ...data.navAdmin] : data.navMain;

  return (
    <Sidebar
      collapsible="offcanvas"
      {...props}
      className="bg-white border-r border-gray-100"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <div className="text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Image
                    src="/robot.png"
                    alt="Logo Bstore"
                    width={62}
                    height={62}
                  />
                </div>
                <span className="text-base font-semibold">Automation WS</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <FieldSeparator />
      <SidebarContent className="px-3 py-4" data-tour="menu-lateral">
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter className="border-t border-gray-100 px-3 py-4">
        <BotonManual rol={user.role} />
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}