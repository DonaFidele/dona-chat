'use client';

import type { User } from 'next-auth';

import { SidebarSubjects } from '@/components/sidebar-subjects';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import Link from 'next/link';

export function AppSidebar({ user }: { user: User | undefined }) {
  return (
    <>
      <div className="shrink-0 border-b border-sidebar-border/80 bg-sidebar text-sidebar-foreground min-[821px]:hidden">
        <div className="px-4 pb-2 pt-3">
          <Link href="/" className="text-lg font-medium tracking-tight">
            Smart Class
          </Link>
          <p className="mt-0.5 text-xs text-sidebar-foreground/55">
            Organisez vos cours et étudiez leurs documents.
          </p>
        </div>
        {user && <SidebarSubjects variant="mobile" />}
      </div>

      <Sidebar
        variant="inset"
        collapsible="none"
        className="hidden border-r border-sidebar-border/80 bg-sidebar min-[821px]:flex"
      >
        <SidebarContent className="px-2">
          {user && <SidebarSubjects />}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border/70 p-2">
          {user && <SidebarUserNav user={user} />}
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
