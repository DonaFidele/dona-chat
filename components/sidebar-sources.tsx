'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { FileIcon } from './icons';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar';
import { getActiveSubjectId, SUBJECT_CHANGED_EVENT } from '@/lib/study-subject';
import { fetcher } from '@/lib/utils';

type Source = {
  id: string;
  position: number;
  name: string;
  uploadedAt: string;
};

type SourcesResponse = { sources: Array<Source> };

export function SidebarSources() {
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

  const removeSource = async (source: Source) => {
    if (!subjectId) return;
    if (!window.confirm(`Retirer « ${source.name} » de ce cours ?`)) return;

    const response = await fetch(
      `/api/sources?id=${encodeURIComponent(source.id)}&subjectId=${encodeURIComponent(subjectId)}`,
      { method: 'DELETE' },
    );

    if (!response.ok) {
      toast.error('Le document n’a pas pu être retiré du cours');
      return;
    }

    await mutate();
    window.dispatchEvent(new Event('sources-updated'));
    toast.success(`${source.name} a été retiré du cours`);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        {subjectId ? 'Documents du cours' : 'Tous les documents'}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {visibleSources?.map((source) => (
            <SidebarMenuItem key={source.id}>
              <SidebarMenuButton
                tooltip={source.name}
                title={source.name}
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
              {subjectId && (
                <SidebarMenuAction
                  type="button"
                  showOnHover
                  onClick={() => void removeSource(source)}
                  aria-label={`Retirer ${source.name} du cours`}
                  title="Retirer du cours"
                >
                  <Trash2 size={14} />
                </SidebarMenuAction>
              )}
            </SidebarMenuItem>
          ))}
          {data?.sources.length === 0 && (
            <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
              {subjectId
                ? 'Aucun document dans ce cours. Utilise + sur le cours pour en ajouter.'
                : 'Aucun document ajouté.'}
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
                  : `Voir ${hiddenSourceCount} document${hiddenSourceCount > 1 ? 's' : ''} de plus`}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
