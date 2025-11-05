// components/nav-secondary.tsx
"use client"

import * as React from "react"
import { type Icon } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/src/components/ui/sidebar"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: Icon
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                asChild
                className="rounded-lg px-3 py-2.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all duration-200 group"
              >
                <a href={item.url} className="flex items-center gap-3">
                  <item.icon 
                    className="h-4 w-4 text-gray-400 group-hover:text-emerald-500 transition-colors duration-200" 
                  />
                  <span className="text-sm font-medium">{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}