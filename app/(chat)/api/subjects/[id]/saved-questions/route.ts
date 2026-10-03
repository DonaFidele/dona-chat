import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import {
  createSavedQuestion,
  getSavedQuestions,
  getSubjectById,
  updateSavedQuestion,
} from '@/lib/db/queries';

const paramsSchema = z.object({ id: z.string().uuid() });
const createSchema = z.object({
  question: z.string().trim().min(1).max(2_000),
});
const updateSchema = z.object({ id: z.string().uuid(), resolved: z.boolean() });

async function getOwnerSubject(params: Promise<{ id: string }>) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) return null;
  const subject = await getSubjectById({
    id: parsedParams.data.id,
    userId: session.user.id,
  });
  return subject ? { subject, userId: session.user.id } : null;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getOwnerSubject(params);
  if (!owner)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  return Response.json({
    questions: await getSavedQuestions({
      userId: owner.userId,
      subjectId: owner.subject.id,
    }),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getOwnerSubject(params);
  if (!owner)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  const payload = createSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!payload.success)
    return Response.json({ error: 'Question invalide' }, { status: 422 });
  return Response.json(
    {
      question: await createSavedQuestion({
        userId: owner.userId,
        subjectId: owner.subject.id,
        question: payload.data.question,
      }),
    },
    { status: 201 },
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getOwnerSubject(params);
  if (!owner)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  const payload = updateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!payload.success)
    return Response.json({ error: 'Modification invalide' }, { status: 422 });
  const question = await updateSavedQuestion({
    ...payload.data,
    userId: owner.userId,
    subjectId: owner.subject.id,
  });
  if (!question)
    return Response.json({ error: 'Question introuvable' }, { status: 404 });
  return Response.json({ question });
}
