import { auth } from '@/app/(auth)/auth';
import { getReviewSheetsBySubject, getSubjectById } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const subjectId = request.nextUrl.searchParams.get('subjectId');
  if (!subjectId) {
    return Response.json({ sheets: [] });
  }

  const subject = await getSubjectById({
    id: subjectId,
    userId: session.user.id,
  });
  if (!subject) {
    return Response.json({ error: 'Subject not found' }, { status: 404 });
  }

  const sheets = await getReviewSheetsBySubject({
    userId: session.user.id,
    subjectId,
  });
  return Response.json({ sheets });
}
