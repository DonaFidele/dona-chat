'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileIcon, PlusIcon } from './icons';
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
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils';
import { toast } from 'sonner';
import { getActiveSubjectId, SUBJECT_CHANGED_EVENT } from '@/lib/study-subject';

const acceptedFileTypes =
  'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,application/json,text/markdown,.md,.mdx';

type Source = {
  position: number;
  name: string;
  uploadedAt: string;
};

type SourcesResponse = {
  sources: Array<Source>;
};

export function SidebarSources() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const sourcesUrl = subjectId
    ? `/api/sources?subjectId=${encodeURIComponent(subjectId)}`
    : '/api/sources';
  const { data, mutate } = useSWR<SourcesResponse>(sourcesUrl, fetcher);
  const visibleSources = showAll ? data?.sources : data?.sources.slice(0, 3);
  const hiddenSourceCount = Math.max((data?.sources.length ?? 0) - 3, 0);

  useEffect(() => {
    const refreshSources = () => mutate();
    window.addEventListener('sources-updated', refreshSources);

    return () => window.removeEventListener('sources-updated', refreshSources);
  }, [mutate]);

  useEffect(() => {
    const refreshSubject = () => {
      setSubjectId(getActiveSubjectId());
      setShowAll(false);
    };
    refreshSubject();
    window.addEventListener(SUBJECT_CHANGED_EVENT, refreshSubject);

    return () =>
      window.removeEventListener(SUBJECT_CHANGED_EVENT, refreshSubject);
  }, []);

  const uploadSource = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    if (subjectId) formData.append('subjectId', subjectId);

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        result?.error ?? `Upload failed (HTTP ${response.status})`,
      );
    }

    return result;
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setIsUploading(true);

    try {
      await uploadSource(file);
      await mutate();
      window.dispatchEvent(new Event('sources-updated'));
      toast.success(`${file.name} a été ajouté aux sources`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "L'ajout de la source a échoué",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Sources</SidebarGroupLabel>
      <SidebarGroupAction asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Ajouter une source"
        >
          <PlusIcon size={14} />
        </Button>
      </SidebarGroupAction>
      <SidebarGroupContent>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFileTypes}
          className="hidden"
          onChange={handleFileChange}
        />
        <SidebarMenu>
          {isUploading && (
            <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
              Ajout de la source…
            </div>
          )}
          {visibleSources?.map((source) => (
            <SidebarMenuItem key={`${source.name}-${source.uploadedAt}`}>
              <SidebarMenuButton
                tooltip={source.name}
                className="h-auto py-1.5"
              >
                <FileIcon size={14} />
                <span className="flex min-w-0 flex-col items-start gap-0.5">
                  <span className="w-full truncate">{source.name}</span>
                  <span className="text-xs text-sidebar-foreground/50">
                    #{source.position} ·{' '}
                    {format(new Date(source.uploadedAt), 'd MMM yyyy, HH:mm', {
                      locale: fr,
                    })}
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {data?.sources.length === 0 && !isUploading && (
            <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
              Aucune source ajoutée.
            </div>
          )}
          {hiddenSourceCount > 0 && (
            <SidebarMenuItem>
              <SidebarMenuButton
                type="button"
                className="justify-center text-xs text-sidebar-foreground/70"
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll
                  ? 'Voir moins'
                  : `Voir ${hiddenSourceCount} source${hiddenSourceCount > 1 ? 's' : ''} de plus`}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
