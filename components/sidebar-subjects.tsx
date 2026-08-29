'use client';

import { Folder, Plus } from 'lucide-react';
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
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar';

type Subject = {
  id: string;
  name: string;
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
    router.push('/');
    router.refresh();
  };

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
            : '/',
        );
        router.refresh();
      })
      .catch(() => {
        router.push(
          subject.latestChatId ? `/chat/${subject.latestChatId}` : '/',
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
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={!activeSubjectId}
              onClick={() => {
                setActiveSubjectId(null);
                router.push('/');
                router.refresh();
              }}
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
                onClick={() => openSubjectChat(subject)}
                tooltip={subject.name}
              >
                <Folder size={14} />
                <span className="truncate">{subject.name}</span>
                <span className="ml-auto mr-5 text-xs text-sidebar-foreground/50">
                  {subject.documentCount}
                </span>
              </SidebarMenuButton>
              <SidebarMenuAction
                type="button"
                showOnHover
                disabled={isUploading}
                onClick={(event) => {
                  event.stopPropagation();
                  setUploadSubject(subject);
                  fileInputRef.current?.click();
                }}
                aria-label={`Ajouter des documents à ${subject.name}`}
                title="Ajouter des documents"
              >
                <Plus size={14} />
              </SidebarMenuAction>
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
