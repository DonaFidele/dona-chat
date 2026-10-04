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
import { QuizStudyPanel } from './quiz-study-panel';
import { StudySheetPanel } from './study-sheet-panel';
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
  subjectId,
  onAskSavedQuestion,
}: {
  subjectId: string | null | undefined;
  onAskSavedQuestion: (question: string) => void;
}) {
  const [activeTool, setActiveTool] = useState<Tool>(null);
  const [selectedSource, setSelectedSource] = useState<SelectedSource | null>(
    null,
  );
  const [expanded, setExpanded] = useState(false);
  const panelOpen =
    activeTool === 'documents' ||
    activeTool === 'notes' ||
    activeTool === 'schedule' ||
    activeTool === 'source' ||
    activeTool === 'fiche' ||
    activeTool === 'quiz';

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

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (!event.altKey || event.defaultPrevented) return;
      const tools: Array<Exclude<Tool, null>> = [
        'documents',
        'notes',
        'schedule',
        'quiz',
        'fiche',
      ];
      const index = Number(event.key) - 1;
      if (index < 0 || index >= tools.length) return;
      event.preventDefault();
      setActiveTool((current) =>
        current === tools[index] ? null : tools[index],
      );
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  const toggle = (tool: Exclude<Tool, null>) => {
    setActiveTool((current) => (current === tool ? null : tool));
  };

  const panelTitle =
    activeTool === 'documents'
      ? 'Documents'
      : activeTool === 'notes'
        ? 'Notes'
        : activeTool === 'schedule'
          ? 'Planning'
          : activeTool === 'quiz'
            ? 'Quiz'
            : activeTool === 'fiche'
              ? 'Fiche de révision'
              : 'Source';

  const panelContent =
    activeTool === 'documents' ? (
      <SidebarSources />
    ) : activeTool === 'notes' ? (
      <NotesPanel subjectId={subjectId} onAsk={onAskSavedQuestion} />
    ) : activeTool === 'schedule' ? (
      <SchedulePanel subjectId={subjectId} />
    ) : activeTool === 'quiz' ? (
      <QuizStudyPanel subjectId={subjectId} />
    ) : activeTool === 'fiche' ? (
      <StudySheetPanel
        subjectId={subjectId}
        onExpand={() => setExpanded((value) => !value)}
      />
    ) : (
      <SourceViewerPanel source={selectedSource} />
    );

  return (
    <>
      {panelOpen && (
        <aside
          className={cn(
            'hidden shrink-0 overflow-y-auto border-l border-border/70 bg-background/95 p-4 min-[821px]:block',
            expanded ? 'w-[min(44vw,620px)]' : 'w-96',
          )}
        >
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
        <RailButton
          active={activeTool === 'quiz'}
          label="Quiz (Alt+4)"
          onClick={() => toggle('quiz')}
        >
          <ListChecks />
        </RailButton>
        <RailButton
          active={activeTool === 'fiche'}
          label="Fiche de révision (Alt+5)"
          onClick={() => toggle('fiche')}
        >
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
        <RailButton
          active={activeTool === 'quiz'}
          label="Quiz"
          onClick={() => toggle('quiz')}
        >
          <ListChecks />
        </RailButton>
        <RailButton
          active={activeTool === 'fiche'}
          label="Générer une fiche"
          onClick={() => toggle('fiche')}
        >
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
