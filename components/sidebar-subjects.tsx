'use client';

import { BookOpen, FileText, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  getActiveSubjectId,
  setActiveSubjectId,
  SUBJECT_CHANGED_EVENT,
} from '@/lib/study-subject';
import { fetcher } from '@/lib/utils';
import { Button } from './ui/button';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar';

type Subject = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  documentCount: number;
  latestChatId: string | null;
};

type SubjectsResponse = { subjects: Array<Subject> };

export function SidebarSubjects({
  variant = 'sidebar',
}: {
  variant?: 'sidebar' | 'mobile';
}) {
  const router = useRouter();
  const { data, mutate } = useSWR<SubjectsResponse>('/api/subjects', fetcher);
  const [activeSubjectId, setActiveSubject] = useState<string | null>(null);

  useEffect(() => {
    const refreshActiveSubject = () => setActiveSubject(getActiveSubjectId());
    refreshActiveSubject();
    window.addEventListener(SUBJECT_CHANGED_EVENT, refreshActiveSubject);
    return () =>
      window.removeEventListener(SUBJECT_CHANGED_EVENT, refreshActiveSubject);
  }, []);

  useEffect(() => {
    const refreshSubjects = () => mutate();
    window.addEventListener('subjects-updated', refreshSubjects);
    return () =>
      window.removeEventListener('subjects-updated', refreshSubjects);
  }, [mutate]);

  const openSubjectChat = (subject: Subject) => {
    setActiveSubjectId(subject.id);
    void fetch('/api/subjects')
      .then((response) => response.json())
      .then((result: SubjectsResponse) => {
        const currentSubject = result.subjects.find(
          (item) => item.id === subject.id,
        );
        router.push(
          currentSubject?.latestChatId
            ? `/chat/${currentSubject.latestChatId}`
            : `/chat?subject=${subject.id}`,
        );
        router.refresh();
      })
      .catch(() => {
        router.push(
          subject.latestChatId
            ? `/chat/${subject.latestChatId}`
            : `/chat?subject=${subject.id}`,
        );
        router.refresh();
      });
  };

  const createSubject = () => {
    router.push('/?create=1');
  };

  if (variant === 'mobile') {
    return (
      <nav
        aria-label="Matières"
        className="flex min-w-0 items-center gap-2 overflow-hidden px-3 py-2"
      >
        <Button
          variant="outline"
          size="icon"
          className="size-9 shrink-0 border-sidebar-border bg-transparent"
          onClick={createSubject}
          aria-label="Créer une matière"
          title="Créer une matière"
        >
          <Plus />
        </Button>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {data?.subjects.map((subject) => (
            <Button
              key={subject.id}
              type="button"
              variant="ghost"
              className="h-auto min-h-12 min-w-36 shrink-0 items-start rounded-md border border-transparent px-3 py-2 text-left hover:bg-sidebar-accent"
              data-active={activeSubjectId === subject.id}
              onClick={() => openSubjectChat(subject)}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{
                      backgroundColor:
                        subject.color ?? 'hsl(var(--sidebar-primary))',
                    }}
                    aria-hidden="true"
                  />
                  <span className="max-w-28 truncate text-sm font-medium">
                    {subject.name}
                  </span>
                </span>
                <span className="pl-[18px] text-[10px] text-sidebar-foreground/55">
                  {subject.documentCount} document
                  {subject.documentCount === 1 ? '' : 's'}
                </span>
              </span>
            </Button>
          ))}
          {data?.subjects.length === 0 && (
            <p className="flex items-center px-2 text-xs text-sidebar-foreground/55">
              Créez votre première matière.
            </p>
          )}
        </div>
      </nav>
    );
  }

  return (
    <SidebarGroup className="p-3">
      <Button
        variant="outline"
        className="mb-3 h-9 w-full justify-center border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent"
        onClick={createSubject}
      >
        <Plus /> Nouvelle matière
      </Button>
      <SidebarGroupLabel className="px-0 font-mono text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/50">
        Matières
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {data?.subjects.map((subject) => (
            <SidebarMenuItem key={subject.id}>
              <SidebarMenuButton
                isActive={activeSubjectId === subject.id}
                onClick={() => openSubjectChat(subject)}
                tooltip={subject.name}
                className="group/subject h-auto min-h-12 rounded-md px-2 py-2"
              >
                <span
                  className="size-3.5 shrink-0 rounded-[3px] ring-1 ring-sidebar-foreground/20"
                  style={{
                    backgroundColor:
                      subject.color ?? 'hsl(var(--sidebar-primary))',
                  }}
                  aria-hidden="true"
                />
                <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                  <span className="flex w-full items-center gap-2">
                    <BookOpen className="size-3.5 shrink-0 text-sidebar-foreground/65 group-data-[active=true]/subject:text-sidebar-primary" />
                    <span className="truncate text-sm font-medium">
                      {subject.name}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 pl-5 text-[10px] text-sidebar-foreground/50 group-data-[active=true]/subject:text-sidebar-primary/75">
                    <FileText className="size-3" /> {subject.documentCount}{' '}
                    document{subject.documentCount === 1 ? '' : 's'}
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {data?.subjects.length === 0 && (
            <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
              Crée une matière pour organiser tes cours.
            </div>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
