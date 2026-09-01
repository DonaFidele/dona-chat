import { auth } from '@/app/(auth)/auth';
import { restoreSubject } from '@/lib/db/queries';
export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  const subject = await restoreSubject({ id, userId: session.user.id });
  if (!subject)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  return Response.json({ subject });
}
