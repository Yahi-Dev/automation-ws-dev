import React from 'react';
import { headers } from 'next/headers';
import { auth } from '@/src/lib/auth';
import { Separator } from './ui/separator';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from './ui/breadcrumb';
import { SidebarInset, SidebarProvider, SidebarTrigger } from './ui/sidebar';
import { AppSidebar } from './app-sidebar';

interface BreadcrumbItem {
  title: string;
  href: string;
}

interface SidebarWithBreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[];
  children?: React.ReactNode;
}

export const AppLayout = async ({
  breadcrumbs,
  children
}: SidebarWithBreadcrumbsProps) => {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = {
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
    avatar: session?.user?.image ?? "",
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((item, index) => (
                  <React.Fragment key={index}>
                    <BreadcrumbItem className={index === 0 ? 'hidden md:block' : ''}>
                      {index === breadcrumbs.length - 1 ? (
                        <span className="font-medium text-foreground">
                          {item.title}
                        </span>
                      ) : (
                        <BreadcrumbLink href={item.href}>
                          {item.title}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && (
                      <BreadcrumbSeparator className="hidden md:block" />
                    )}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};