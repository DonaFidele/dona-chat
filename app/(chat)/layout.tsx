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
        className="min-h-dvh flex-col bg-[#102827] min-[821px]:flex-row min-[821px]:p-[14px]"
      >
        <AppSidebar user={session?.user} />
        <SidebarInset className="min-h-0 flex-1 overflow-hidden bg-background min-[821px]:rounded-xl min-[821px]:border min-[821px]:border-[#35504d]">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
