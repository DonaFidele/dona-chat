'use client';

import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon } from './icons';
import { BookOpen } from 'lucide-react';
import { useSidebar } from './ui/sidebar';
import { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

function PureChatHeader({
  subjectName,
}: {
  subjectName?: string | null;
}) {
  const router = useRouter();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="flex min-h-[74px] items-center gap-3 border-b border-border/80 px-5 py-3 md:px-6">
      <div className="lg:hidden">
        <SidebarToggle />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
          <BookOpen size={16} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-medium tracking-tight">
            {subjectName ?? 'Dona-Chat'}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Posez une question sur les documents de cette matière.
          </p>
        </div>
      </div>

      {(!open || windowWidth < 768) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0"
              onClick={() => {
                router.push('/');
                router.refresh();
              }}
            >
              <PlusIcon />
              <span className="md:sr-only">Retour aux matières</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Retour aux matières</TooltipContent>
        </Tooltip>
      )}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.subjectName === nextProps.subjectName;
});
