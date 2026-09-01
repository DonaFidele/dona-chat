import { auth } from '@/app/(auth)/auth';
import { getSubjectById, revokeSubjectShare } from '@/lib/db/queries';
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; token: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  const { id, token } = await params;
  if (!(await getSubjectById({ id, userId: session.user.id })))
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  const share = await revokeSubjectShare({ token, subjectId: id });
  return share
    ? Response.json({ share })
    : Response.json({ error: 'Lien introuvable' }, { status: 404 });
}
