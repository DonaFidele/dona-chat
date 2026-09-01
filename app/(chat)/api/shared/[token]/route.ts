import { getActiveSubjectShare, getSubjectForShare } from '@/lib/db/queries';
export async function GET(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const share = await getActiveSubjectShare(token);
  if (!share)
    return Response.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
  const subject = await getSubjectForShare(share.subjectId);
  return Response.json({
    subject,
    scope: share.scope,
    expiresAt: share.expiresAt,
  });
}
