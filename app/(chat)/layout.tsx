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
        className="h-dvh min-h-dvh flex-col items-center overflow-hidden bg-[#102827] p-3 min-[821px]:items-stretch min-[821px]:p-[14px]"
      >
        <div className="flex min-h-0 w-full max-w-[390px] flex-1 flex-col overflow-hidden rounded-[2rem] border border-[#35504d] bg-background shadow-2xl shadow-black/20 min-[821px]:max-w-none min-[821px]:rounded-xl">
          <header className="hidden shrink-0 border-b border-border/80 px-6 py-5 min-[821px]:block">
            <h1 className="text-xl font-medium tracking-tight">Smart Class</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Vos matières, documents et révisions au même endroit.
            </p>
          </header>
          <div className="flex min-h-0 flex-1 flex-col min-[821px]:flex-row">
            <AppSidebar user={session?.user} />
            <SidebarInset className="min-h-0 flex-1 overflow-hidden bg-background">
              {children}
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
