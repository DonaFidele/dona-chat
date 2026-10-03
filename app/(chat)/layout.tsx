import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '../(auth)/auth';
import Script from 'next/script';

export const instant = false;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <SidebarProvider
        defaultOpen={!isCollapsed}
        className="min-h-dvh bg-[#102827] p-3 lg:p-[14px]"
      >
        <AppSidebar user={session?.user} />
        <SidebarInset className="min-h-0 overflow-hidden rounded-r-xl border-y border-r border-[#35504d] bg-background lg:rounded-xl">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
