// components/nav-main.tsx
"use client"

import { type Icon } from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/src/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
  }[]
}) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wide px-4 mb-3">
        Navegación
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(item.url)
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  className={[
                    "group relative transition-all duration-200",
                    "rounded-lg px-4 py-3",
                    "hover:bg-emerald-50 hover:border-emerald-200",
                    active
                      ? "bg-emerald-50 text-emerald-900 font-semibold border-l-4 border-emerald-500 shadow-sm"
                      : "text-gray-600 hover:text-emerald-800 border-l-4 border-transparent",
                  ].join(" ")}
                >
                  <Link
                    href={item.url}
                    prefetch
                    aria-current={active ? "page" : undefined}
                    className="flex items-center gap-3"
                  >
                    {item.icon && (
                      <item.icon
                        className={[
                          "shrink-0 transition-colors duration-200",
                          active
                            ? "text-emerald-600 h-5 w-5"
                            : "text-gray-400 group-hover:text-emerald-500 h-5 w-5",
                        ].join(" ")}
                      />
                    )}
                    <span className={[
                      "transition-all duration-200",
                      active ? "text-base" : "text-base"
                    ].join(" ")}>
                      {item.title}
                    </span>
                    
                    {/* Efecto sutil para el estado activo */}
                    {active && (
                      <div className="absolute inset-0 rounded-lg bg-emerald-500/5" aria-hidden="true" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}