"use client"

import {
  type Icon,
} from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/src/components/ui/sidebar"

export function NavDocuments({
  items,
}: {
  items: {
    name: string
    url: string
    icon: Icon
  }[]
}) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Documents</SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(item.url)
            return (
              <SidebarMenuItem key={item.name} className="relative">
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  className={[
                    "group relative transition-all",
                    "rounded-lg px-3 py-2",
                    "hover:bg-slate-100",
                    active
                      ? "bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-200 shadow-sm"
                      : "text-slate-600",
                  ].join(" ")}
                >
                  <Link
                    href={item.url}
                    prefetch
                    aria-current={active ? "page" : undefined}
                  >
                    {/* barrita izquierda */}
                    <span
                      className={[
                        "absolute left-0 top-1/2 -translate-y-1/2",
                        "h-6 w-1 rounded-r",
                        "transition-all",
                        active
                          ? "bg-indigo-600"
                          : "bg-transparent group-hover:bg-slate-300",
                      ].join(" ")}
                      aria-hidden
                    />
                    {/* icono */}
                    {item.icon && (
                      <item.icon
                        className={[
                          "h-4 w-4 shrink-0 transition-colors",
                          active
                            ? "text-indigo-600"
                            : "text-slate-500 group-hover:text-slate-700",
                        ].join(" ")}
                      />
                    )}
                    <span className="truncate">{item.name}</span>
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