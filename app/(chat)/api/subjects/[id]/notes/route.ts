import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import {
  createStudyNote,
  deleteStudyNote,
  getStudyNotes,
  getSubjectById,
  updateStudyNote,
} from '@/lib/db/queries';

const paramsSchema = z.object({ id: z.string().uuid() });
const createSchema = z.object({
  content: z.string().trim().min(1).max(10_000),
});
const updateSchema = z.object({
  id: z.string().uuid(),
  content: z.string().trim().min(1).max(10_000).optional(),
  starred: z.boolean().optional(),
});

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
    notes: await getStudyNotes({
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
    return Response.json({ error: 'Note invalide' }, { status: 422 });
  return Response.json(
    {
      note: await createStudyNote({
        userId: owner.userId,
        subjectId: owner.subject.id,
        content: payload.data.content,
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
  const note = await updateStudyNote({
    ...payload.data,
    userId: owner.userId,
    subjectId: owner.subject.id,
  });
  if (!note)
    return Response.json({ error: 'Note introuvable' }, { status: 404 });
  return Response.json({ note });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getOwnerSubject(params);
  if (!owner)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  const noteId = z
    .string()
    .uuid()
    .safeParse(new URL(request.url).searchParams.get('id'));
  if (!noteId.success)
    return Response.json({ error: 'Note invalide' }, { status: 422 });
  const note = await deleteStudyNote({
    id: noteId.data,
    userId: owner.userId,
    subjectId: owner.subject.id,
  });
  if (!note)
    return Response.json({ error: 'Note introuvable' }, { status: 404 });
  return Response.json({ ok: true });
}
