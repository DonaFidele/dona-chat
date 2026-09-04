'use client';

import { LoaderCircle, MoreHorizontal, Pencil, Trash2, BookOpen, Calculator, FlaskConical, Landmark, Scale } from 'lucide-react';
import { getSubjectTheme } from '@/lib/subject-colors';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

export type SubjectCardData = { id?: string; name: string; description?: string | null; color?: string | null; documentCount?: number; latestChatId?: string | null; isExample?: boolean };
const icons = { book: BookOpen, calculator: Calculator, flask: FlaskConical, landmark: Landmark, scale: Scale };

export function SubjectCard({ subject, isOpening = false, onOpen, onEdit, onDelete }: { subject: SubjectCardData; isOpening?: boolean; onOpen: (subject: SubjectCardData) => void; onEdit?: (subject: SubjectCardData) => void; onDelete?: (subject: SubjectCardData) => void }) {
  const theme = getSubjectTheme(subject.name, subject.color);
  const Icon = icons[theme.icon];
  return <div className="group relative">
    <button type="button" className="relative w-full overflow-hidden rounded-xl border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl disabled:cursor-wait disabled:opacity-75" style={{ borderColor: `${theme.color}55` }} onClick={() => onOpen(subject)} disabled={isOpening} aria-label={`Ouvrir la matière ${subject.name}`}>
      <div className="relative flex items-start justify-between gap-4"><span className="grid size-12 place-items-center rounded-xl" style={{ backgroundColor: theme.color, color: theme.accent }}><Icon size={23} /></span></div>
      <div className="relative mt-6"><h2 className="truncate text-xl font-semibold">{subject.name}</h2><p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">{subject.description || 'Organisez vos documents et révisez ce cours.'}</p></div>
      <div className="relative mt-6 flex items-center justify-between"><span className="text-xs text-muted-foreground">{subject.documentCount ?? 0} document{(subject.documentCount ?? 0) > 1 ? 's' : ''}</span><span className="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium" style={{ backgroundColor: theme.color, color: '#fff' }}>{isOpening ? <LoaderCircle className="animate-spin" size={15} /> : 'Ouvrir'}</span></div>
    </button>
    {subject.id && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100" aria-label={`Actions pour ${subject.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onEdit?.(subject)}><Pencil /> Modifier</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(subject)}><Trash2 /> Supprimer</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
  </div>;
}
