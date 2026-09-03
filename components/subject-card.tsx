'use client';

import {
  BookOpen,
  Calculator,
  FlaskConical,
  Landmark,
  LoaderCircle,
  Scale,
} from 'lucide-react';
import { getSubjectTheme } from '@/lib/subject-colors';

export type SubjectCardData = {
  id?: string;
  name: string;
  description?: string | null;
  color?: string | null;
  documentCount?: number;
  latestChatId?: string | null;
  isExample?: boolean;
};

const icons = {
  book: BookOpen,
  calculator: Calculator,
  flask: FlaskConical,
  landmark: Landmark,
  scale: Scale,
};

export function SubjectCard({
  subject,
  isOpening = false,
  onOpen,
}: {
  subject: SubjectCardData;
  isOpening?: boolean;
  onOpen: (subject: SubjectCardData) => void;
}) {
  const theme = getSubjectTheme(subject.name, subject.color);
  const Icon = icons[theme.icon];

  return (
    <button
      type="button"
      className="group relative w-full overflow-hidden rounded-xl border bg-card p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-75"
      style={{ borderColor: `${theme.color}55` }}
      onClick={() => onOpen(subject)}
      disabled={isOpening}
      aria-label={`Ouvrir la matière ${subject.name}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-70"
        style={{
          background: `linear-gradient(135deg, ${theme.color}2b, ${theme.accent}1a)`,
        }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <span
          className="grid size-12 place-items-center rounded-xl shadow-sm"
          style={{ backgroundColor: theme.color, color: theme.accent }}
          aria-hidden="true"
        >
          <Icon size={23} />
        </span>
        {subject.isExample && (
          <span
            className="rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: `${theme.accent}26`, color: theme.color }}
          >
            Exemple
          </span>
        )}
      </div>

      <div className="relative mt-6 min-w-0">
        <h2 className="truncate text-xl font-semibold">{subject.name}</h2>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">
          {subject.description ||
            'Organisez vos documents et révisez ce cours.'}
        </p>
      </div>

      <div className="relative mt-6 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {subject.documentCount ?? 0} document
          {(subject.documentCount ?? 0) > 1 ? 's' : ''}
        </span>
        <span
          className="inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium"
          style={{ backgroundColor: theme.color, color: '#fff' }}
        >
          {isOpening ? (
            <LoaderCircle className="animate-spin" size={15} />
          ) : (
            'Ouvrir'
          )}
        </span>
      </div>
    </button>
  );
}
