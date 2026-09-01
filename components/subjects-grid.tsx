'use client';

import { SubjectCard, type SubjectCardData } from './subject-card';

export function SubjectsGrid({
  subjects,
  openingSubjectId,
  onOpen,
}: {
  subjects: Array<SubjectCardData>;
  openingSubjectId: string | null;
  onOpen: (subject: SubjectCardData) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {subjects.map((subject) => (
        <SubjectCard
          key={subject.id ?? subject.name}
          subject={subject}
          isOpening={openingSubjectId === (subject.id ?? 'law-example')}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
