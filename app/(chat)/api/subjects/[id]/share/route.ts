import { auth } from '@/app/(auth)/auth';
import { createSubjectShare, getSubjectById } from '@/lib/db/queries';
import { z } from 'zod';
const schema = z.object({
  scope: z.enum(['read', 'comment']).default('read'),
  days: z.number().int().min(1).max(30).default(7),
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!(await getSubjectById({ id, userId: session.user.id })))
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  const body = schema.safeParse(await request.json());
  if (!body.success)
    return Response.json({ error: 'Paramètres invalides' }, { status: 400 });
  const expiresAt = new Date(Date.now() + body.data.days * 86400000);
  const share = await createSubjectShare({
    subjectId: id,
    scope: body.data.scope,
    expiresAt,
  });
  return Response.json(
    {
      share,
      url: `${new URL(request.url).origin}/subjects/shared/${share.token}`,
    },
    { status: 201 },
  );
}
