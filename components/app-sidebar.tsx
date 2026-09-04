'use client';

import type { User } from 'next-auth';

import { SidebarHistory } from '@/components/sidebar-history';
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
    <Sidebar className="border-r border-sidebar-border/70 bg-sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
                Dona-Chat
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
