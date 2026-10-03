'use client';

import { useEffect, useState } from 'react';
import {
  BookMarked,
  CalendarDays,
  FileText,
  Lightbulb,
  ListChecks,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotesPanel } from './notes-panel';
import { SchedulePanel } from './schedule-panel';
import { SidebarSources } from './sidebar-sources';
import { SourceViewerPanel } from './source-viewer-panel';
import { Button } from './ui/button';

type Tool =
  | 'documents'
  | 'notes'
  | 'schedule'
  | 'source'
  | 'fiche'
  | 'quiz'
  | null;

type SelectedSource = {
  documentId?: string;
  name: string;
  page?: number | null;
  snippet?: string;
};

export function StudyToolRail({
  onGenerateStudySheet,
  onGenerateQuiz,
  subjectId,
  onAskSavedQuestion,
}: {
  onGenerateStudySheet: () => void;
  onGenerateQuiz: () => void;
  subjectId: string | null | undefined;
  onAskSavedQuestion: (question: string) => void;
}) {
  const [activeTool, setActiveTool] = useState<Tool>(null);
  const [selectedSource, setSelectedSource] = useState<SelectedSource | null>(
    null,
  );
  const panelOpen =
    activeTool === 'documents' ||
    activeTool === 'notes' ||
    activeTool === 'schedule' ||
    activeTool === 'source';

  useEffect(() => {
    const openSource = (event: Event) => {
      const source = (event as CustomEvent<SelectedSource>).detail;
      if (!source?.documentId) return;
      setSelectedSource(source);
      setActiveTool('source');
    };
    window.addEventListener('open-source-viewer', openSource);
    return () => window.removeEventListener('open-source-viewer', openSource);
  }, []);

  const toggle = (tool: Exclude<Tool, null>) => {
    if (tool === 'fiche') {
      onGenerateStudySheet();
      return;
    }
    if (tool === 'quiz') {
      onGenerateQuiz();
      return;
    }
    setActiveTool((current) => (current === tool ? null : tool));
  };

  const panelTitle =
    activeTool === 'documents'
      ? 'Documents'
      : activeTool === 'notes'
        ? 'Notes'
        : activeTool === 'schedule'
          ? 'Planning'
          : 'Source';

  const panelContent =
    activeTool === 'documents' ? (
      <SidebarSources />
    ) : activeTool === 'notes' ? (
      <NotesPanel subjectId={subjectId} onAsk={onAskSavedQuestion} />
    ) : activeTool === 'schedule' ? (
      <SchedulePanel subjectId={subjectId} />
    ) : (
      <SourceViewerPanel source={selectedSource} />
    );

  return (
    <>
      {panelOpen && (
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border/70 bg-background/95 p-4 min-[821px]:block">
          <PanelHeader title={panelTitle} onClose={() => setActiveTool(null)} />
          {panelContent}
        </aside>
      )}

      <aside className="hidden w-[52px] shrink-0 flex-col items-center gap-2 border-l border-border/80 bg-card py-3 min-[821px]:flex">
        <RailButton
          label="Ajouter un document"
          onClick={() =>
            window.dispatchEvent(new Event('open-document-upload'))
          }
        >
          <Upload />
        </RailButton>
        <RailButton
          active={activeTool === 'documents'}
          label="Documents"
          onClick={() => toggle('documents')}
        >
          <FileText />
        </RailButton>
        <RailButton
          active={activeTool === 'notes'}
          label="Notes et questions à revoir"
          onClick={() => toggle('notes')}
        >
          <Lightbulb />
        </RailButton>
        <RailButton
          active={activeTool === 'schedule'}
          label="Planning"
          onClick={() => toggle('schedule')}
        >
          <CalendarDays />
        </RailButton>
        <RailButton label="Quiz" onClick={() => toggle('quiz')}>
          <ListChecks />
        </RailButton>
        <RailButton label="Fiche de révision" onClick={() => toggle('fiche')}>
          <BookMarked />
        </RailButton>
      </aside>

      {panelOpen && (
        <section className="max-h-[35dvh] overflow-y-auto border-t border-border/80 bg-background px-4 py-3 min-[821px]:hidden">
          <PanelHeader title={panelTitle} onClose={() => setActiveTool(null)} />
          {panelContent}
        </section>
      )}

      <div className="flex shrink-0 items-center justify-center gap-1 border-t border-border/80 bg-card px-3 py-2 min-[821px]:hidden">
        <RailButton
          label="Ajouter un document"
          onClick={() =>
            window.dispatchEvent(new Event('open-document-upload'))
          }
        >
          <Upload />
        </RailButton>
        <RailButton
          active={activeTool === 'documents'}
          label="Documents"
          onClick={() => toggle('documents')}
        >
          <FileText />
        </RailButton>
        <RailButton
          active={activeTool === 'notes'}
          label="Notes"
          onClick={() => toggle('notes')}
        >
          <Lightbulb />
        </RailButton>
        <RailButton
          active={activeTool === 'schedule'}
          label="Planning"
          onClick={() => toggle('schedule')}
        >
          <CalendarDays />
        </RailButton>
        <RailButton label="Quiz" onClick={() => toggle('quiz')}>
          <ListChecks />
        </RailButton>
        <RailButton label="Générer une fiche" onClick={() => toggle('fiche')}>
          <BookMarked />
        </RailButton>
      </div>
    </>
  );
}

function PanelHeader({
  title,
  onClose,
}: { title: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-serif text-lg">{title}</h2>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label={`Fermer ${title}`}
      >
        <X />
      </Button>
    </div>
  );
}

function RailButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'size-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground',
        active && 'bg-primary text-primary-foreground',
      )}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

export default StudyToolRail;
