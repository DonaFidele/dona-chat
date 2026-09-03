'use client';

import { BookOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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

export function SidebarSubjects() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data, mutate } = useSWR<SubjectsResponse>('/api/subjects', fetcher);
  const [activeSubjectId, setActiveSubject] = useState<string | null>(null);
  const [uploadSubject, setUploadSubject] = useState<Subject | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const uploadDocuments = async (files: Array<File>) => {
    if (!uploadSubject || files.length === 0) return;

    setIsUploading(true);
    try {
      const results = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('subjectId', uploadSubject.id);
          const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData,
          });
          const result = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(
              result?.error ?? `Échec de l'ajout de ${file.name}`,
            );
          }
          return file.name;
        }),
      );

      await mutate();
      window.dispatchEvent(new Event('sources-updated'));
      toast.success(
        `${results.length} document${results.length > 1 ? 's ont' : ' a'} été ajouté${results.length > 1 ? 's' : ''} à ${uploadSubject.name}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "L'ajout des documents a échoué",
      );
    } finally {
      setIsUploading(false);
      setUploadSubject(null);
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/50">
        Mes matières
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,application/json,text/markdown,.md,.mdx"
          className="hidden"
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = '';
            void uploadDocuments(files);
          }}
        />
        <SidebarMenu>
          {data?.subjects.map((subject) => (
            <SidebarMenuItem key={subject.id}>
              <SidebarMenuButton
                isActive={activeSubjectId === subject.id}
                onClick={() => openSubjectChat(subject)}
                tooltip={subject.name}
                className="group/subject h-10 rounded-lg px-2"
              >
                <span
                  className="size-3.5 shrink-0 rounded-[3px] ring-1 ring-sidebar-foreground/20"
                  style={{ backgroundColor: subject.color ?? 'hsl(var(--sidebar-primary))' }}
                  aria-hidden="true"
                />
                <BookOpen className="text-sidebar-foreground/65 group-data-[active=true]/subject:text-sidebar-primary" />
                <span className="truncate">{subject.name}</span>
                <span className="ml-auto mr-5 text-xs text-sidebar-foreground/50">
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
