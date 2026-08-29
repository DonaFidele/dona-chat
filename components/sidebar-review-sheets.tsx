'use client';

import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
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

export function SidebarReviewSheets() {
  const { setArtifact } = useArtifact();
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const url = subjectId
    ? `/api/review-sheets?subjectId=${encodeURIComponent(subjectId)}`
    : null;
  const { data } = useSWR<ReviewSheetsResponse>(url, fetcher);

  useEffect(() => {
    const refreshSubject = () => setSubjectId(getActiveSubjectId());
    refreshSubject();
    window.addEventListener(SUBJECT_CHANGED_EVENT, refreshSubject);
    return () =>
      window.removeEventListener(SUBJECT_CHANGED_EVENT, refreshSubject);
  }, []);

  if (!subjectId || !data?.sheets.length) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Fiches de révision</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {data.sheets.slice(0, 3).map((sheet) => (
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
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
