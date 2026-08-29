'use client';

import { FileText, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { initialArtifactData, useArtifact } from '@/hooks/use-artifact';
import { getActiveSubjectId, SUBJECT_CHANGED_EVENT } from '@/lib/study-subject';
import { fetcher } from '@/lib/utils';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar';

type ReviewSheet = { id: string; title: string; createdAt: string };
type ReviewSheetsResponse = { sheets: Array<ReviewSheet> };
type Subject = { id: string; latestChatId: string | null };
type SubjectsResponse = { subjects: Array<Subject> };

export function SidebarReviewSheets() {
  const router = useRouter();
  const { setArtifact } = useArtifact();
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const url = subjectId
    ? `/api/review-sheets?subjectId=${encodeURIComponent(subjectId)}`
    : null;
  const { data, mutate } = useSWR<ReviewSheetsResponse>(url, fetcher);
  const { data: subjects } = useSWR<SubjectsResponse>(
    subjectId ? '/api/subjects' : null,
    fetcher,
  );

  useEffect(() => {
    const refreshSubject = () => setSubjectId(getActiveSubjectId());
    const refreshSheets = () => mutate();
    refreshSubject();
    window.addEventListener(SUBJECT_CHANGED_EVENT, refreshSubject);
    window.addEventListener('subjects-updated', refreshSheets);
    return () => {
      window.removeEventListener(SUBJECT_CHANGED_EVENT, refreshSubject);
      window.removeEventListener('subjects-updated', refreshSheets);
    };
  }, [mutate]);

  if (!subjectId) return null;

  const generateSheet = () => {
    const subject = subjects?.subjects.find((item) => item.id === subjectId);
    const path = subject?.latestChatId ? `/chat/${subject.latestChatId}` : '/';
    router.push(
      `${path}?query=${encodeURIComponent('Génère une fiche de révision complète pour ce cours.')}`,
    );
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Fiches de révision</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={generateSheet}
              tooltip="Générer une fiche"
            >
              <Sparkles size={14} />
              <span>Générer une fiche</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {data?.sheets.map((sheet) => (
            <SidebarMenuItem key={sheet.id}>
              <SidebarMenuButton
                tooltip={sheet.title}
                onClick={() =>
                  setArtifact({
                    ...initialArtifactData,
                    documentId: sheet.id,
                    title: sheet.title,
                    kind: 'text',
                    isVisible: true,
                    status: 'idle',
                  })
                }
              >
                <FileText size={14} />
                <span className="truncate">{sheet.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {!data?.sheets.length && (
            <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
              Crée une première fiche à partir des documents du cours.
            </div>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
