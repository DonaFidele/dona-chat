import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { updateSubjectStudySettings } from '@/lib/db/queries';

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z
  .object({
    language: z.enum(['auto', 'fr', 'en']).optional(),
    studyMode: z.enum(['qa', 'socratic']).optional(),
  })
  .refine(
    (value) => value.language !== undefined || value.studyMode !== undefined,
  );

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  const parsedParams = paramsSchema.safeParse(await params);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsedParams.success || !body.success)
    return Response.json({ error: 'Réglages invalides' }, { status: 422 });
  const subject = await updateSubjectStudySettings({
    id: parsedParams.data.id,
    userId: session.user.id,
    ...body.data,
  });
  if (!subject)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  return Response.json({ subject });
}
