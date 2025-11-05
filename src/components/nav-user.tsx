// components/nav-user.tsx
"use client";

import {
  IconDotsVertical,
  IconLogout,
  IconUserCircle,
  IconBell,
  IconShield,
} from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/src/components/ui/sidebar";
import { authClient } from "@/src/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function NavUser({
  user,
}: {
  user: { name: string; email: string; avatar: string };
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      router.push("/login");
    } catch (e) {
      console.error("Error al cerrar sesión:", e);
    }
  };

  // Función para obtener las iniciales del nombre
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-emerald-50 data-[state=open]:text-emerald-700 rounded-lg border border-transparent hover:border-emerald-200 hover:bg-emerald-50 transition-all duration-200"
            >
              <Avatar className="h-8 w-8 rounded-lg border border-emerald-200">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-emerald-100 text-emerald-700 font-medium">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-gray-900">{user.name}</span>
                <span className="text-gray-500 truncate text-xs">
                  {user.email}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4 text-gray-400" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg border border-emerald-100 bg-white shadow-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-9 w-9 rounded-lg border border-emerald-200">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-emerald-100 text-emerald-700 font-medium">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium text-gray-900">{user.name}</span>
                  <span className="text-gray-500 truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-emerald-100/50" />

            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer focus:bg-emerald-50 focus:text-emerald-700">
                <Link href="/account-settings" className="flex items-center gap-2 w-full">
                  <IconUserCircle className="text-emerald-600 size-4" />
                  <span>Mi Cuenta</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer focus:bg-emerald-50 focus:text-emerald-700">
                <div className="flex items-center gap-2">
                  <IconBell className="text-emerald-600 size-4" />
                  <span>Notificaciones</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer focus:bg-emerald-50 focus:text-emerald-700">
                <div className="flex items-center gap-2">
                  <IconShield className="text-emerald-600 size-4" />
                  <span>Privacidad</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-emerald-100/50" />

            <DropdownMenuItem 
              onClick={handleLogout}
              className="cursor-pointer focus:bg-red-50 focus:text-red-700 text-red-600"
            >
              <IconLogout className="text-red-500 size-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}