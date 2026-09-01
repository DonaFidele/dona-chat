import { auth } from '@/app/(auth)/auth';
import { createSubject, getSubjectsByUserId } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { z } from 'zod';

const createSubjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(180).optional(),
  color: z.string().trim().max(32).optional(),
});

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const subjects = await getSubjectsByUserId({ userId: session.user.id });
  return Response.json({ subjects });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const payload = createSubjectSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json(
      { error: 'A subject name is required' },
      { status: 400 },
    );
  }

  const createdSubject = await createSubject({
    name: payload.data.name,
    description: payload.data.description || null,
    color: payload.data.color || null,
    userId: session.user.id,
  });

  return Response.json({ subject: createdSubject }, { status: 201 });
}
