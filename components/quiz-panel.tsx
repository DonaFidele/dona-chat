'use client';

import { ArrowLeft, CircleHelp } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

type QuizQuestion = {
  question: string;
  answers: string[];
  correct: number;
};

const questions: QuizQuestion[] = [
  {
    question: 'Quel organe est compétent pour le contrôle de constitutionnalité en France ?',
    answers: ['La Cour de cassation', 'Le Conseil constitutionnel', "Le Conseil d'État"],
    correct: 1,
  },
  {
    question: 'Quand intervient le contrôle a priori ?',
    answers: ['Avant la promulgation de la loi', 'Après sa publication', 'Uniquement après un recours'],
    correct: 0,
  },
  {
    question: 'Que permet principalement une QPC ?',
    answers: ['Contester une loi déjà en vigueur', 'Rédiger une nouvelle Constitution', 'Voter une loi'],
    correct: 0,
  },
  {
    question: 'Quelle norme doit respecter une loi ?',
    answers: ['La Constitution', 'Un règlement intérieur', 'Une simple circulaire'],
    correct: 0,
  },
  {
    question: 'Quel est le rôle du Conseil constitutionnel ?',
    answers: ['Contrôler la conformité des lois à la Constitution', 'Diriger les tribunaux', 'Promulguer les lois'],
    correct: 0,
  },
];

export function QuizPanel({ subjectName, onBack }: { subjectName: string; onBack: () => void }) {
  const [current, setCurrent] = useState(1);
  const [selected, setSelected] = useState<number | null>(1);
  const [submitted, setSubmitted] = useState(false);
  const question = questions[current - 1];
  const progress = (current / questions.length) * 100;

  function submitAnswer() {
    if (selected === null) return;
    setSubmitted(true);
  }

  function nextQuestion() {
    if (current < questions.length) {
      setCurrent((value) => value + 1);
      setSelected(null);
      setSubmitted(false);
    }
  }

  return (
    <aside className="flex h-full min-h-dvh w-full max-w-xl flex-col border-l border-border bg-background px-8 py-5 md:px-10 lg:px-12">
      <button type="button" onClick={onBack} className="flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft />
        Retour au chat
      </button>
      <div className="mt-7 flex flex-col gap-5">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quiz · {subjectName}</p>
          <h2 className="mt-4 font-serif text-3xl italic leading-tight">Question {current} sur {questions.length}</h2>
        </div>
        <div className="h-4 overflow-hidden rounded-sm bg-muted" aria-label={`${current} questions sur ${questions.length}`}>
          <div className="h-full rounded-sm bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <h3 className="pt-5 text-pretty text-xl leading-8 md:text-2xl">{question.question}</h3>
        <div className="flex flex-col gap-3" role="radiogroup" aria-label="Réponses possibles">
          {question.answers.map((answer, index) => {
            const isSelected = selected === index;
            const isCorrect = submitted && index === question.correct;
            const isWrong = submitted && isSelected && index !== question.correct;
            return (
              <button
                key={answer}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => !submitted && setSelected(index)}
                className={cn(
                  'flex min-h-12 items-center gap-3 rounded-lg border border-border px-4 text-left text-sm transition-colors md:text-base',
                  isSelected && !submitted && 'border-2 border-foreground',
                  isCorrect && 'border-2 border-primary',
                  isWrong && 'border-destructive text-destructive',
                  !submitted && !isSelected && 'hover:border-foreground/60',
                )}
              >
                <span className={cn('size-4 shrink-0 rounded-full border border-muted-foreground/60', isSelected && 'bg-foreground ring-4 ring-foreground/15', isCorrect && 'bg-primary ring-primary/20')} />
                {answer}
              </button>
            );
          })}
        </div>
        {submitted && (
          <p className="text-sm text-muted-foreground">{selected === question.correct ? 'Bonne réponse.' : `La bonne réponse était : ${question.answers[question.correct]}`}</p>
        )}
        <Button onClick={current === questions.length && submitted ? onBack : submitted ? nextQuestion : submitAnswer} disabled={selected === null} className="mt-2 h-13 w-full rounded-full text-base font-semibold">
          {current === questions.length && submitted ? 'Terminer le quiz' : submitted ? 'Question suivante' : 'Valider ma réponse'}
        </Button>
      </div>
    </aside>
  );
}

export function QuizIntro({ subjectName, onStart }: { subjectName: string; onStart: () => void }) {
  return (
    <div className="flex min-h-full flex-1 flex-col gap-5 p-7 md:p-10">
      <div className="flex items-center gap-3 text-primary"><CircleHelp /><span className="font-mono text-xs uppercase tracking-[0.16em]">Quiz en cours</span></div>
      <div className="max-w-xl rounded-2xl bg-card p-5 text-base leading-7 text-card-foreground">Très bien ! Je t&apos;ai préparé un quiz de 5 questions sur <strong>{subjectName}</strong> pour tester tes connaissances.</div>
      <Button onClick={onStart} className="w-fit rounded-full">Commencer le quiz</Button>
    </div>
  );
}

export { questions };

// Keep the question bank local so the interaction works even when the chat stream is idle.
void questions;
