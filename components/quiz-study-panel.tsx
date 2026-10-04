'use client';

import { FileText, LoaderCircle, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { fetcher, cn } from '@/lib/utils';
import { Button } from './ui/button';

type Question = {
  id: string;
  question: string;
  answers: Array<string>;
  source: {
    documentId: string;
    name: string;
    page: number | null;
    snippet: string;
  };
};
type QuizState = {
  quiz: { id: string; questions: Array<Question> } | null;
  attempt: {
    id: string;
    answers: Array<number | null>;
    startedAt: string;
    questionIndexes?: Array<number>;
  } | null;
  readyDocuments: number;
  processingDocuments: number;
};
type Result = {
  score: number;
  total: number;
  percent: number;
  onTwenty: number;
  durationSeconds: number;
  label: string;
  delta: number | null;
  newPersonalBest: boolean;
  review: Array<{
    question: string;
    answer: number | null;
    correct: number;
    correctAnswer: string;
    explanation: string;
    questionIndex: number;
    source: Question['source'];
  }>;
  personalRanking: Array<{
    position: number;
    score: number | null;
    total: number;
    percent: number | null;
    durationSeconds: number;
    current: boolean;
  }>;
  leaderboard: Array<{
    position: number;
    displayName: string | null;
    score: number | null;
    total: number;
    percent: number | null;
  }>;
  leaderboardPosition: number | null;
  leaderboardTotal: number;
};

export function QuizStudyPanel({
  subjectId,
}: { subjectId: string | null | undefined }) {
  const url = subjectId ? `/api/subjects/${subjectId}/quiz` : null;
  const { data, mutate } = useSWR<QuizState>(url, fetcher);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.quiz || !data.attempt) return;
    setAnswers(data.attempt.answers);
    setActiveQuestion((current) =>
      Math.min(current, (data.quiz?.questions.length ?? 1) - 1),
    );
  }, [data?.quiz, data?.attempt]);

  const question = data?.quiz?.questions[activeQuestion];
  const complete = useMemo(
    () =>
      Boolean(
        data?.quiz &&
          answers.filter((answer) => answer !== null).length ===
            data.quiz.questions.length,
      ),
    [answers, data?.quiz],
  );

  if (!subjectId)
    return (
      <p className="text-sm text-muted-foreground">
        Choisissez une matière pour ouvrir un quiz.
      </p>
    );

  const generate = async (force = false, questionIndexes?: Array<number>) => {
    if (!url) return;
    setError(null);
    setIsGenerating(true);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force, questionIndexes }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(payload?.message ?? 'Le quiz n’a pas pu être généré.');
      await mutate();
      setResult(null);
      setActiveQuestion(0);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Le quiz n’a pas pu être généré.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const choose = async (answer: number) => {
    if (!data?.attempt || !data.quiz || !url) return;
    const nextAnswers = data.quiz.questions.map(
      (_, index) => answers[index] ?? null,
    );
    nextAnswers[activeQuestion] = answer;
    setAnswers(nextAnswers);
    await fetch(`${url}/attempt`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId: data.attempt.id,
        answers: nextAnswers,
      }),
    });
  };

  const submit = async () => {
    if (!data?.attempt || !url || !complete) return;
    const response = await fetch(`${url}/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit',
        attemptId: data.attempt.id,
        answers,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? 'La correction a échoué.');
      return;
    }
    setResult(payload.result);
    await mutate();
  };

  if (result)
    return (
      <QuizResult
        result={result}
        onRetry={() => void generate(false)}
        onRetryMissed={(questionIndexes) =>
          void generate(false, questionIndexes)
        }
      />
    );
  if (isGenerating) return <Loading label="Préparation des cinq questions…" />;
  if (error)
    return <ErrorState message={error} onRetry={() => void generate()} />;
  if (!data) return <Loading label="Chargement du quiz…" />;
  if (!data.quiz) {
    const message = data.processingDocuments
      ? 'Vos documents sont encore en cours de traitement.'
      : 'Aucun document dans cette matière. Ajoutez un document pour générer votre quiz.';
    return (
      <div className="space-y-3 rounded-md border border-dashed p-4 text-sm">
        <p className="text-muted-foreground">{message}</p>
        {data.readyDocuments > 0 ? (
          <Button onClick={() => void generate()}>Générer 5 questions</Button>
        ) : (
          <Button
            onClick={() =>
              window.dispatchEvent(new Event('open-document-upload'))
            }
          >
            Ajouter un document
          </Button>
        )}
      </div>
    );
  }
  if (!question) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Question {activeQuestion + 1} / {data.quiz.questions.length}
        </span>
        <Button size="sm" variant="ghost" onClick={() => void generate(true)}>
          Regénérer
        </Button>
      </div>
      <div className="h-2 overflow-hidden rounded bg-muted">
        <div
          className="h-full bg-primary transition-[width]"
          style={{
            width: `${((activeQuestion + 1) / data.quiz.questions.length) * 100}%`,
          }}
        />
      </div>
      <h3 className="text-base font-medium leading-6">{question.question}</h3>
      <div
        className="space-y-2"
        role="radiogroup"
        aria-label="Réponses du quiz"
      >
        {question.answers.map((answer, index) => (
          <button
            key={answer}
            type="button"
            role="radio"
            aria-checked={answers[activeQuestion] === index}
            onClick={() => void choose(index)}
            className={cn(
              'w-full rounded-md border p-3 text-left text-sm transition-colors hover:border-primary',
              answers[activeQuestion] === index &&
                'border-primary bg-primary/10',
            )}
          >
            {String.fromCharCode(65 + index)}. {answer}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={activeQuestion === 0}
          onClick={() => setActiveQuestion((value) => value - 1)}
        >
          Précédente
        </Button>
        {activeQuestion < data.quiz.questions.length - 1 ? (
          <Button
            size="sm"
            onClick={() => setActiveQuestion((value) => value + 1)}
          >
            Suivante
          </Button>
        ) : (
          <Button size="sm" disabled={!complete} onClick={() => void submit()}>
            Voir mon résultat
          </Button>
        )}
      </div>
    </div>
  );
}

function QuizResult({
  result,
  onRetry,
  onRetryMissed,
}: {
  result: Result;
  onRetry: () => void;
  onRetryMissed: (questionIndexes: Array<number>) => void;
}) {
  const missedQuestionIndexes = result.review
    .filter((item) => item.answer !== item.correct)
    .map((item) => item.questionIndex);
  return (
    <div className="space-y-5">
      <section className="rounded-md border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">Résultat</p>
        <p className="mt-1 text-3xl font-semibold">
          {result.score} / {result.total}
        </p>
        <p className="text-sm">
          {result.percent}% · {result.onTwenty}/20 · {result.label}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {result.durationSeconds}s
          {result.delta !== null
            ? ` · ${result.delta >= 0 ? '+' : ''}${result.delta} pts vs tentative précédente`
            : ''}
        </p>
        {result.newPersonalBest && (
          <p className="mt-2 text-sm font-medium text-primary">
            Nouveau record personnel !
          </p>
        )}
      </section>
      <section>
        <h3 className="font-medium">Classement personnel</h3>
        <ol className="mt-2 space-y-1 text-sm">
          {result.personalRanking.map((entry) => (
            <li
              key={entry.position}
              className={entry.current ? 'font-semibold text-primary' : ''}
            >
              #{entry.position} · {entry.score}/{entry.total} · {entry.percent}%
              · {entry.durationSeconds}s
            </li>
          ))}
        </ol>
      </section>
      {result.leaderboard.length > 0 && (
        <section>
          <h3 className="font-medium">Classement public</h3>
          {result.leaderboardPosition !== null && (
            <p className="mt-1 text-xs text-muted-foreground">
              Vous êtes #{result.leaderboardPosition} sur{' '}
              {result.leaderboardTotal}.
            </p>
          )}
          <ol className="mt-2 space-y-1 text-sm">
            {result.leaderboard.map((entry) => (
              <li key={`${entry.position}-${entry.displayName}`}>
                #{entry.position} · {entry.displayName} · {entry.score}/
                {entry.total} · {entry.percent}%
              </li>
            ))}
          </ol>
        </section>
      )}
      <section className="space-y-3">
        <h3 className="font-medium">Correction</h3>
        {result.review.map((item, index) => (
          <article
            key={item.question}
            className="rounded-md border p-3 text-sm"
          >
            <p className="font-medium">
              {index + 1}. {item.question}
            </p>
            <p className="mt-1">
              Votre réponse :{' '}
              {item.answer === null
                ? 'Aucune'
                : String.fromCharCode(65 + item.answer)}
            </p>
            <p>Bonne réponse : {item.correctAnswer}</p>
            <p className="mt-1 text-muted-foreground">{item.explanation}</p>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('open-source-viewer', {
                    detail: item.source,
                  }),
                )
              }
            >
              <FileText size={14} /> {item.source.name}
              {item.source.page ? ` p. ${item.source.page}` : ''}
            </Button>
          </article>
        ))}
      </section>
      <div className="grid gap-2">
        <Button className="w-full" onClick={onRetry}>
          <RotateCcw size={15} /> Refaire le quiz
        </Button>
        {missedQuestionIndexes.length > 0 && (
          <Button
            className="w-full"
            variant="outline"
            onClick={() => onRetryMissed(missedQuestionIndexes)}
          >
            Refaire seulement les questions ratées
          </Button>
        )}
      </div>
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
      <LoaderCircle className="animate-spin" size={16} /> {label}
    </div>
  );
}
function ErrorState({
  message,
  onRetry,
}: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-3 rounded-md border border-destructive/40 p-4 text-sm">
      <p>{message}</p>
      <Button size="sm" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}
