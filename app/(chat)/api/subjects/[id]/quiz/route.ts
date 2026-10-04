import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import {
  createQuizAttempt,
  getInProgressQuizAttempt,
  getStudyQuiz,
  getSubjectById,
  getUploadedResourcesByUserId,
  saveStudyQuiz,
  updateSubjectGenerationStatus,
} from '@/lib/db/queries';
import { generateStoredQuiz } from '@/lib/study-generation';

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({
  force: z.boolean().optional().default(false),
  questionIndexes: z
    .array(z.number().int().min(0).max(4))
    .min(1)
    .max(5)
    .refine((indexes) => new Set(indexes).size === indexes.length)
    .optional(),
});

function publicQuestions(
  questions: NonNullable<Awaited<ReturnType<typeof getStudyQuiz>>>['questions'],
  questionIndexes?: Array<number>,
) {
  const selectedQuestions =
    questionIndexes && questionIndexes.length > 0
      ? questionIndexes.map((index) => questions[index]).filter(Boolean)
      : questions;
  return selectedQuestions.map(
    ({ correct: _, explanation: __, ...question }) => question,
  );
}

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

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getOwner(params);
  if (!owner)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  const quiz = await getStudyQuiz({
    userId: owner.userId,
    subjectId: owner.subject.id,
  });
  const attempt = quiz
    ? await getInProgressQuizAttempt({
        userId: owner.userId,
        subjectId: owner.subject.id,
        quizId: quiz.id,
      })
    : null;
  const resources = await getUploadedResourcesByUserId({
    userId: owner.userId,
    subjectId: owner.subject.id,
  });
  return Response.json({
    quiz: quiz
      ? {
          id: quiz.id,
          questions: publicQuestions(quiz.questions, attempt?.questionIndexes),
          generatedFromVersion: quiz.generatedFromVersion,
        }
      : null,
    attempt: attempt
      ? {
          id: attempt.id,
          answers: attempt.answers,
          startedAt: attempt.startedAt,
        }
      : null,
    status: owner.subject.quizStatus,
    readyDocuments: resources.filter((resource) => resource.status === 'ready')
      .length,
    processingDocuments: resources.filter(
      (resource) =>
        resource.status === 'pending' || resource.status === 'processing',
    ).length,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getOwner(params);
  const body = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!owner)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  if (!body.success)
    return Response.json({ error: 'Requête invalide' }, { status: 422 });

  const resources = await getUploadedResourcesByUserId({
    userId: owner.userId,
    subjectId: owner.subject.id,
  });
  if (!resources.some((resource) => resource.status === 'ready')) {
    const processing = resources.some(
      (resource) =>
        resource.status === 'pending' || resource.status === 'processing',
    );
    return Response.json(
      {
        code: processing ? 'DOCUMENTS_PROCESSING' : 'NO_DOCUMENTS',
        message: processing
          ? 'Les documents sont encore en cours de traitement.'
          : 'Ajoutez un document lisible avant de générer un quiz.',
      },
      { status: 409 },
    );
  }

  let quiz = await getStudyQuiz({
    userId: owner.userId,
    subjectId: owner.subject.id,
  });
  const alreadyExisted = Boolean(quiz);
  if (!quiz || body.data.force) {
    try {
      await updateSubjectGenerationStatus({
        id: owner.subject.id,
        userId: owner.userId,
        kind: 'quiz',
        status: 'generating',
      });
      const questions = await generateStoredQuiz({
        userId: owner.userId,
        subjectId: owner.subject.id,
        subjectName: owner.subject.name,
        language: owner.subject.language,
      });
      if (questions.length !== 5) {
        await updateSubjectGenerationStatus({
          id: owner.subject.id,
          userId: owner.userId,
          kind: 'quiz',
          status: 'failed',
        });
        return Response.json(
          {
            code: 'GENERATION_FAILED',
            message: 'Le quiz n’a pas pu être généré. Réessayez.',
          },
          { status: 422 },
        );
      }
      quiz = await saveStudyQuiz({
        userId: owner.userId,
        subjectId: owner.subject.id,
        questions,
        generatedFromVersion: owner.subject.documentsVersion,
      });
      await updateSubjectGenerationStatus({
        id: owner.subject.id,
        userId: owner.userId,
        kind: 'quiz',
        status: 'ready',
      });
    } catch (error) {
      console.error('Quiz generation failed:', error);
      await updateSubjectGenerationStatus({
        id: owner.subject.id,
        userId: owner.userId,
        kind: 'quiz',
        status: 'failed',
      });
      return Response.json(
        {
          code: 'GENERATION_FAILED',
          message: 'Le quiz n’a pas pu être généré. Réessayez.',
        },
        { status: 422 },
      );
    }
  }

  const existingAttempt = await getInProgressQuizAttempt({
    userId: owner.userId,
    subjectId: owner.subject.id,
    quizId: quiz.id,
  });
  const attempt =
    existingAttempt ??
    (await createQuizAttempt({
      userId: owner.userId,
      subjectId: owner.subject.id,
      quizId: quiz.id,
      total: body.data.questionIndexes?.length ?? quiz.questions.length,
      questionIndexes: body.data.questionIndexes,
    }));
  return Response.json({
    quiz: {
      id: quiz.id,
      questions: publicQuestions(quiz.questions, attempt.questionIndexes),
      generatedFromVersion: quiz.generatedFromVersion,
    },
    attempt: {
      id: attempt.id,
      answers: attempt.answers,
      startedAt: attempt.startedAt,
      questionIndexes: attempt.questionIndexes,
    },
    alreadyExisted,
  });
}
