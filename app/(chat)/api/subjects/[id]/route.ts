import { auth } from '@/app/(auth)/auth';
import {
  archiveSubject,
  getSubjectById,
  permanentlyDeleteSubject,
  restoreSubject,
  updateSubject,
} from '@/lib/db/queries';
import { z } from 'zod';

const subjectSchema = z.object({
  name: z.string().trim().min(3).max(60),
  description: z.string().trim().max(180).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
});

async function owner(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    session,
    subject: await getSubjectById({ id, userId: session.user.id }),
  };
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await owner(id);
  if (!result?.subject)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  return Response.json({ subject: result.subject });
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await owner(id);
  const body = subjectSchema.safeParse(await request.json());
  if (!result?.subject)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  if (!body.success)
    return Response.json(
      { error: 'Nom (3-60 caractères) et couleur hexadécimale requis.' },
      { status: 400 },
    );
  return Response.json({
    subject: await updateSubject({
      id,
      userId: result.session.user.id,
      ...body.data,
    }),
  });
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await owner(id);
  if (!result?.subject)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  const hard = new URL(request.url).searchParams.get('hard') === 'true';
  const subject = hard
    ? await permanentlyDeleteSubject({ id, userId: result.session.user.id })
    : await archiveSubject({ id, userId: result.session.user.id });
  return Response.json({ subject, archived: !hard });
}
