'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import type { VisibilityType } from './visibility-selector';
import { Button } from '@/components/ui/button';
import { PlusIcon, VercelIcon } from './icons';
import { BookOpen, FileText, CircleHelp } from 'lucide-react';
import { SidebarSources } from './sidebar-sources';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useSidebar } from './ui/sidebar';
import { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import type { Session } from 'next-auth';

function PureChatHeader({
  chatId,
  selectedModelId,
  isReadonly,
  session,
  subjectName,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  subjectName?: string | null;
}) {
  const router = useRouter();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border/70 bg-background px-4 py-3 md:px-6">
      <SidebarToggle />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <BookOpen />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold tracking-tight">{subjectName ?? 'Dona-Chat'}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Espace d&apos;étude</p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="order-2 ml-auto text-muted-foreground" aria-label="Afficher les fichiers uploadés" title="Fichiers uploadés">
            <FileText />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-2">
          <SidebarSources />
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="order-3 flex w-full items-center gap-2 md:order-2 md:w-auto">
        <Button
          asChild
          variant="outline"
          className="h-9 rounded-full border-accent px-3 text-sm"
        >
          <Link href={`/chat/${chatId}?query=${encodeURIComponent('Génère une fiche de révision complète pour ce cours.')}`}>
            <FileText data-icon="inline-start" />
            Générer une fiche de révision
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-9 rounded-full border-primary px-3 text-sm"
        >
          <Link href={`/chat/${chatId}?query=${encodeURIComponent('Fais-moi un quiz sur ce cours.')}`}>
            <CircleHelp data-icon="inline-start" />
            Faire un quiz
          </Link>
        </Button>
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
              <span className="md:sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      )}

      <Button
        className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900 hidden md:flex py-1.5 px-2 h-fit md:h-[34px] order-4 md:ml-auto"
        asChild
      >
        <Link
          href={`https://vercel.com/new/clone?repository-url=https://github.com/vercel/ai-chatbot&env=AUTH_SECRET&envDescription=Learn more about how to get the API Keys for the application&envLink=https://github.com/vercel/ai-chatbot/blob/main/.env.example&demo-title=AI Chatbot&demo-description=An Open-Source AI Chatbot Template Built With Next.js and the AI SDK by Vercel.&demo-url=https://chat.vercel.ai&products=[{"type":"integration","protocol":"ai","productSlug":"grok","integrationSlug":"xai"},{"type":"integration","protocol":"storage","productSlug":"neon","integrationSlug":"neon"},{"type":"integration","protocol":"storage","productSlug":"upstash-kv","integrationSlug":"upstash"},{"type":"blob"}]`}
          target="_noblank"
        >
          <VercelIcon size={16} />
          Deploy with Vercel
        </Link>
      </Button>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.subjectName === nextProps.subjectName &&
    prevProps.chatId === nextProps.chatId
  );
});
