'use client';

import { useState } from 'react';
import { BookMarked, CalendarDays, FileText, Lightbulb, ListChecks, X } from 'lucide-react';
import { Button } from './ui/button';
import { SidebarSources } from './sidebar-sources';
import { cn } from '@/lib/utils';

type Tool = 'documents' | 'fiche' | 'quiz' | 'notes' | 'planning' | null;

export function StudyToolRail({
  onGenerateStudySheet,
  onGenerateQuiz,
}: {
  onGenerateStudySheet: () => void;
  onGenerateQuiz: () => void;
}) {
  const [activeTool, setActiveTool] = useState<Tool>(null);

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

  return (
    <>
      <aside className="hidden w-14 shrink-0 flex-col items-center gap-2 border-l border-border/70 bg-background/70 py-4 lg:flex">
        <RailButton active={activeTool === 'documents'} label="Documents" onClick={() => toggle('documents')}>
          <FileText />
        </RailButton>
        <RailButton label="Fiche de révision" onClick={() => toggle('fiche')}>
          <BookMarked />
        </RailButton>
        <RailButton label="Quiz" onClick={() => toggle('quiz')}>
          <ListChecks />
        </RailButton>
        <RailButton active={activeTool === 'notes'} label="Notes" onClick={() => toggle('notes')}>
          <Lightbulb />
        </RailButton>
        <RailButton active={activeTool === 'planning'} label="Planning" onClick={() => toggle('planning')}>
          <CalendarDays />
        </RailButton>
      </aside>

      {activeTool && (
        <aside className="hidden w-80 shrink-0 border-l border-border/70 bg-background/95 p-4 lg:block">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg">
              {activeTool === 'documents' && 'Documents'}
              {activeTool === 'notes' && 'Notes du cours'}
              {activeTool === 'planning' && 'Planning'}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setActiveTool(null)} aria-label="Fermer le panneau">
              <X />
            </Button>
          </div>
          {activeTool === 'documents' && <SidebarSources />}
          {activeTool === 'notes' && <p className="text-sm text-muted-foreground">Capture tes idées importantes pendant le cours.</p>}
          {activeTool === 'planning' && <p className="text-sm text-muted-foreground">Ton planning de révision apparaîtra ici.</p>}
        </aside>
      )}
    </>
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
      className={cn('relative text-muted-foreground hover:bg-accent hover:text-accent-foreground', active && 'bg-accent text-accent-foreground')}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

export default StudyToolRail;
