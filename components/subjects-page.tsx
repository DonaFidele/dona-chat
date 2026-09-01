'use client';

import { BookPlus, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { setActiveSubjectId } from '@/lib/study-subject';
import { fetcher } from '@/lib/utils';
import { CreateSubjectModal, type NewSubject } from './create-subject-modal';
import type { SubjectCardData } from './subject-card';
import { SubjectsGrid } from './subjects-grid';
import { Button } from './ui/button';

type SubjectsResponse = { subjects: Array<SubjectCardData> };

const lawExample: SubjectCardData = {
  name: 'Le droit',
  description: 'Responsabilité civile, pénale et cas pratiques.',
  color: '#1E3A8A',
  documentCount: 0,
  isExample: true,
};

export function SubjectsPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<SubjectsResponse>(
    '/api/subjects',
    fetcher,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [openingSubjectId, setOpeningSubjectId] = useState<string | null>(null);

  const openSubject = async (subject: SubjectCardData) => {
    setOpeningSubjectId(subject.id ?? 'law-example');

    try {
      let openedSubject = subject;
      if (!subject.id) {
        const response = await fetch('/api/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: lawExample.name,
            description: lawExample.description,
            color: lawExample.color,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        openedSubject = result.subject;
        await mutate();
      }

      setActiveSubjectId(openedSubject.id ?? null);
      router.push(
        openedSubject.latestChatId
          ? `/chat/${openedSubject.latestChatId}`
          : `/chat?subject=${openedSubject.id}`,
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
  const cards = subjects.length ? subjects : [lawExample];

  return (
    <main className="min-h-dvh bg-gradient-to-b from-background via-background to-muted/35 px-5 py-10 md:px-10 md:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-medium text-primary">
              Dona-Chat · Étudier à partir de vos documents
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
              Choisissez une matière pour commencer.
            </h1>
            <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground md:text-lg">
              Ouvrez un cours pour discuter avec ses documents, ou créez une
              matière pour organiser vos révisions.
            </p>
          </div>
          <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
            <BookPlus size={17} />
            Créer une matière
          </Button>
        </div>

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
                <p className="mb-5 text-sm text-muted-foreground">
                  Commencez avec l’exemple ci-dessous ou créez votre première
                  matière.
                </p>
              )}
              <SubjectsGrid
                subjects={cards}
                openingSubjectId={openingSubjectId}
                onOpen={(subject) => void openSubject(subject)}
              />
            </>
          )}
        </section>
      </div>

      <CreateSubjectModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreate={createSubject}
      />
    </main>
  );
}
