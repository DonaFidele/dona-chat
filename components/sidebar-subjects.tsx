'use client';

import { Folder, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  getActiveSubjectId,
  setActiveSubjectId,
  SUBJECT_CHANGED_EVENT,
} from '@/lib/study-subject';
import { fetcher } from '@/lib/utils';
import { Button } from './ui/button';
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar';

type Subject = {
  id: string;
  name: string;
  documentCount: number;
};

type SubjectsResponse = { subjects: Array<Subject> };

export function SidebarSubjects() {
  const { data, mutate } = useSWR<SubjectsResponse>('/api/subjects', fetcher);
  const [activeSubjectId, setActiveSubject] = useState<string | null>(null);

  useEffect(() => {
    const refreshActiveSubject = () => setActiveSubject(getActiveSubjectId());
    refreshActiveSubject();
    window.addEventListener(SUBJECT_CHANGED_EVENT, refreshActiveSubject);

    return () =>
      window.removeEventListener(SUBJECT_CHANGED_EVENT, refreshActiveSubject);
  }, []);

  const createSubject = async () => {
    const name = window.prompt('Nom de la matière ou du cours :')?.trim();
    if (!name) return;

    const response = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      toast.error(result?.error ?? "La matière n'a pas pu être créée");
      return;
    }

    setActiveSubjectId(result.subject.id);
    await mutate();
    toast.success(`${result.subject.name} a été créée`);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Matières</SidebarGroupLabel>
      <SidebarGroupAction asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={createSubject}
          aria-label="Ajouter une matière"
        >
          <Plus size={14} />
        </Button>
      </SidebarGroupAction>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={!activeSubjectId}
              onClick={() => setActiveSubjectId(null)}
              tooltip="Tous les documents"
            >
              <Folder size={14} />
              <span>Tous les documents</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {data?.subjects.map((subject) => (
            <SidebarMenuItem key={subject.id}>
              <SidebarMenuButton
                isActive={activeSubjectId === subject.id}
                onClick={() => setActiveSubjectId(subject.id)}
                tooltip={subject.name}
              >
                <Folder size={14} />
                <span className="truncate">{subject.name}</span>
                <span className="ml-auto text-xs text-sidebar-foreground/50">
                  {subject.documentCount}
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
