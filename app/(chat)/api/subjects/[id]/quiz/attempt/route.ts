import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import {
  finishQuizAttempt,
  getQuizAttemptForUser,
  getQuizAttemptHistory,
  getQuizAttemptRanking,
  getQuizLeaderboard,
  getStudyQuiz,
  getSubjectById,
  saveQuizAttemptProgress,
} from '@/lib/db/queries';

const paramsSchema = z.object({ id: z.string().uuid() });
const progressSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z.array(z.number().int().min(0).max(3).nullable()).max(5),
});
const submitSchema = progressSchema.extend({ action: z.literal('submit') });

async function getOwner(params: Promise<{ id: string }>) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) return null;
  const subject = await getSubjectById({
    id: parsed.data.id,
    userId: session.user.id,
  });
  return subject ? { userId: session.user.id, subject } : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getOwner(params);
  const payload = progressSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!owner)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  if (!payload.success)
    return Response.json({ error: 'Progression invalide' }, { status: 422 });
  const attempt = await saveQuizAttemptProgress({
    id: payload.data.attemptId,
    userId: owner.userId,
    subjectId: owner.subject.id,
    answers: payload.data.answers,
  });
  if (!attempt)
    return Response.json({ error: 'Tentative introuvable' }, { status: 404 });
  return Response.json({
    attempt: { id: attempt.id, answers: attempt.answers },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getOwner(params);
  const payload = submitSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!owner)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  if (!payload.success)
    return Response.json({ error: 'Résultat invalide' }, { status: 422 });
  const quiz = await getStudyQuiz({
    userId: owner.userId,
    subjectId: owner.subject.id,
  });
  if (!quiz)
    return Response.json({ error: 'Quiz introuvable' }, { status: 404 });
  const storedAttempt = await getQuizAttemptForUser({
    id: payload.data.attemptId,
    userId: owner.userId,
    subjectId: owner.subject.id,
  });
  if (
    !storedAttempt ||
    storedAttempt.status !== 'in_progress' ||
    storedAttempt.quizId !== quiz.id
  ) {
    return Response.json(
      { error: 'Cette tentative a déjà été envoyée.' },
      { status: 409 },
    );
  }
  const questionIndexes =
    storedAttempt.questionIndexes.length > 0
      ? storedAttempt.questionIndexes
      : quiz.questions.map((_, index) => index);
  const questions = questionIndexes.map((index) => quiz.questions[index]);
  if (questions.some((question) => !question)) {
    return Response.json(
      { error: 'Tentative de quiz invalide.' },
      { status: 422 },
    );
  }
  const answers = questions.map(
    (_, index) => payload.data.answers[index] ?? null,
  );
  const score = questions.reduce(
    (total, question, index) =>
      total + Number(answers[index] === question.correct),
    0,
  );
  const total = questions.length;
  const percent = Math.round((score / total) * 100);
  const durationSeconds = Math.max(
    0,
    Math.round((Date.now() - storedAttempt.startedAt.getTime()) / 1000),
  );
  const attempt = await finishQuizAttempt({
    id: payload.data.attemptId,
    userId: owner.userId,
    subjectId: owner.subject.id,
    answers,
    score,
    total,
    percent,
    durationSeconds,
  });
  if (!attempt)
    return Response.json(
      { error: 'Cette tentative a déjà été envoyée.' },
      { status: 409 },
    );
  const ranking = await getQuizAttemptRanking({
    userId: owner.userId,
    subjectId: owner.subject.id,
  });
  const history = await getQuizAttemptHistory({
    userId: owner.userId,
    subjectId: owner.subject.id,
  });
  const leaderboard = await getQuizLeaderboard({ quizId: quiz.id });
  const currentPosition = ranking.findIndex((item) => item.id === attempt.id);
  const previous = history.find((item) => item.id !== attempt.id);
  const leaderboardPosition = leaderboard.findIndex(
    (item) => item.userId === owner.userId,
  );
  return Response.json({
    result: {
      score,
      total,
      percent,
      onTwenty: Math.round((score / total) * 20 * 10) / 10,
      durationSeconds,
      label:
        percent >= 80 ? 'Excellent' : percent >= 60 ? 'Bien' : 'À renforcer',
      delta:
        previous?.percent === null || previous?.percent === undefined
          ? null
          : percent - previous.percent,
      newPersonalBest: currentPosition === 0,
      review: questions.map((question, index) => ({
        questionIndex: questionIndexes[index],
        question: question.question,
        answer: answers[index],
        correct: question.correct,
        correctAnswer: question.answers[question.correct],
        explanation: question.explanation,
        source: question.source,
      })),
      personalRanking: ranking.map((item, index) => ({
        position: index + 1,
        score: item.score,
        total: item.total,
        percent: item.percent,
        durationSeconds: item.durationSeconds,
        current: item.id === attempt.id,
      })),
      leaderboard: leaderboard.slice(0, 10).map((item, index) => ({
        position: index + 1,
        displayName: item.displayName,
        score: item.score,
        total: item.total,
        percent: item.percent,
      })),
      leaderboardPosition:
        leaderboardPosition === -1 ? null : leaderboardPosition + 1,
      leaderboardTotal: leaderboard.length,
    },
  });
}
