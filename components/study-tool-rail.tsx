'use client';

import { useState } from 'react';
import { BookMarked, FileText, ListChecks, Upload, X } from 'lucide-react';
import { Button } from './ui/button';
import { SidebarSources } from './sidebar-sources';
import { cn } from '@/lib/utils';

type Tool = 'documents' | 'fiche' | 'quiz' | null;

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
      <aside className="hidden w-[52px] shrink-0 flex-col items-center gap-2 border-l border-border/80 bg-card py-3 lg:flex">
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
        <RailButton label="Fiche de révision" onClick={() => toggle('fiche')}>
          <BookMarked />
        </RailButton>
        <RailButton label="Quiz" onClick={() => toggle('quiz')}>
          <ListChecks />
        </RailButton>
      </aside>

      <div className="flex items-center gap-1 border-t border-border/80 bg-card px-3 py-2 lg:hidden">
        <RailButton
          label="Ajouter un document"
          onClick={() =>
            window.dispatchEvent(new Event('open-document-upload'))
          }
        >
          <Upload />
        </RailButton>
        <RailButton label="Documents" onClick={() => toggle('documents')}>
          <FileText />
        </RailButton>
        <RailButton label="Générer une fiche" onClick={() => toggle('fiche')}>
          <BookMarked />
        </RailButton>
        <RailButton label="Générer un quiz" onClick={() => toggle('quiz')}>
          <ListChecks />
        </RailButton>
      </div>

      {activeTool && (
        <aside className="hidden w-80 shrink-0 border-l border-border/70 bg-background/95 p-4 lg:block">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg">
              {activeTool === 'documents' && 'Documents'}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveTool(null)}
              aria-label="Fermer le panneau"
            >
              <X />
            </Button>
          </div>
          {activeTool === 'documents' && <SidebarSources />}
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
