'use client';

import { BookPlus, LoaderCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { setActiveSubjectId } from '@/lib/study-subject';
import { fetcher } from '@/lib/utils';
import { CreateSubjectModal, type NewSubject } from './create-subject-modal';
import type { SubjectCardData } from './subject-card';
import { SubjectsGrid } from './subjects-grid';
import { Button } from './ui/button';

type SubjectsResponse = { subjects: Array<SubjectCardData> };

export function SubjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    setActiveSubjectId(null);
  }, []);
  const { data, error, isLoading, mutate } = useSWR<SubjectsResponse>(
    '/api/subjects',
    fetcher,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [openingSubjectId, setOpeningSubjectId] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState<SubjectCardData | null>(
    null,
  );

  useEffect(() => {
    if (searchParams.get('create') !== '1') return;

    setIsCreateOpen(true);
    router.replace('/');
  }, [router, searchParams]);

  const openSubject = async (subject: SubjectCardData) => {
    if (!subject.id) return;

    setOpeningSubjectId(subject.id);

    try {
      setActiveSubjectId(subject.id);
      router.push(
        subject.latestChatId
          ? `/chat/${subject.latestChatId}`
          : `/chat?subject=${subject.id}`,
      );
    } finally {
      setOpeningSubjectId(null);
    }
  };

  const createSubject = async (subject: NewSubject) => {
    const response = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subject),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error ?? 'Création impossible');

    setIsCreateOpen(false);
    await mutate();
    window.dispatchEvent(new Event('subjects-updated'));
    await openSubject(result.subject);
  };

  const subjects = data?.subjects ?? [];

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-background px-5 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-8 border-b border-border/70 pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-primary">
              Dona-Chat / Tableau de bord
            </p>
            <h1 className="max-w-xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
              Qu&apos;est-ce qu&apos;on étudie aujourd&apos;hui ?
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground md:text-lg">
              Retrouvez vos matières et discutez avec les documents qui vous
              aident à progresser.
            </p>
          </div>
          <Button
            className="w-fit gap-2 rounded-lg"
            onClick={() => setIsCreateOpen(true)}
          >
            <BookPlus data-icon="inline-start" />
            Nouvelle matière
          </Button>
        </header>

        <section className="mt-12" aria-label="Vos matières">
          {isLoading && (
            <div className="flex min-h-52 items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 animate-spin" size={18} />
              Chargement des matières…
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
              Les matières n’ont pas pu être chargées. Réessayez dans un
              instant.
            </div>
          )}
          {!isLoading && !error && (
            <>
              {subjects.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/90 bg-card/60 px-6 py-12 text-center">
                  <p className="text-base font-medium">
                    Aucune matière pour le moment
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Créez une matière, puis ajoutez les documents de votre cours
                    pour commencer à étudier avec Dona-Chat.
                  </p>
                  <Button
                    className="mt-5 gap-2"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <BookPlus data-icon="inline-start" />
                    Créer une matière
                  </Button>
                </div>
              )}
              {subjects.length > 0 && (
                <SubjectsGrid
                  subjects={subjects}
                  openingSubjectId={openingSubjectId}
                  onOpen={(subject) => void openSubject(subject)}
                  onEdit={setEditingSubject}
                  onDelete={async (subject) => {
                    if (
                      !subject.id ||
                      !window.confirm(`Supprimer ${subject.name} ?`)
                    )
                      return;
                    await fetch(`/api/subjects/${subject.id}`, {
                      method: 'DELETE',
                    });
                    setActiveSubjectId(null);
                    await mutate();
                  }}
                />
              )}
            </>
          )}
        </section>
      </div>

      <CreateSubjectModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreate={createSubject}
      />
      <CreateSubjectModal
        open={Boolean(editingSubject)}
        onOpenChange={(open) => !open && setEditingSubject(null)}
        subject={
          editingSubject
            ? {
                name: editingSubject.name,
                description: editingSubject.description ?? '',
                color: editingSubject.color ?? '',
                teacher: editingSubject.teacher ?? '',
                examDate: editingSubject.examDate ?? '',
                explanationLevel: editingSubject.explanationLevel,
                language: editingSubject.language,
              }
            : null
        }
        title="Modifier la matière"
        onCreate={async (value) => {
          if (!editingSubject?.id) return;
          const response = await fetch(`/api/subjects/${editingSubject.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(value),
          });
          if (!response.ok) throw new Error('Modification impossible');
          setEditingSubject(null);
          await mutate();
          window.dispatchEvent(new Event('subjects-updated'));
        }}
      />
    </main>
  );
}
