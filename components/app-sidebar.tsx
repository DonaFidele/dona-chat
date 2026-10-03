'use client';

import type { User } from 'next-auth';

import { SidebarSubjects } from '@/components/sidebar-subjects';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';

export function AppSidebar({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar
      variant="inset"
      className="border-sidebar-border/80 bg-sidebar lg:rounded-xl lg:border"
    >
      <SidebarHeader className="border-b border-sidebar-border/80 px-2 py-3">
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <span className="px-2 text-xl font-medium tracking-tight hover:bg-muted rounded-md cursor-pointer">
                Smart Class
              </span>
              <span className="hidden text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/45 sm:inline">
                espace d&apos;étude
              </span>
            </Link>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {user && <SidebarSubjects />}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/70 p-2">
        {user && <SidebarUserNav user={user} />}
      </SidebarFooter>
    </Sidebar>
  );
}
