'use client';

import { memo } from 'react';

function PureChatHeader({
  subjectName,
}: {
  subjectName?: string | null;
}) {
  return (
    <header className="shrink-0 border-b border-border/80 px-5 py-4 md:px-6">
      <div className="flex min-w-0 items-center justify-between gap-4">
        <p className="truncate text-base font-medium tracking-tight">
          {subjectName ?? 'Dona-Chat'}
        </p>
      </div>
      <p className="mt-4 max-w-2xl text-sm leading-5 text-muted-foreground">
        Posez une question sur les documents de cette matière. Les réponses sont
        exclusivement fondées sur son contenu.
      </p>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.subjectName === nextProps.subjectName;
});
