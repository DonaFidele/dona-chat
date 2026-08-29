import { auth } from '@/app/(auth)/auth';
import { getChatById, getMessageById } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const messageId = request.nextUrl.searchParams.get('messageId');
  if (!messageId) {
    return Response.json({ error: 'Message id is required' }, { status: 400 });
  }

  const [message] = await getMessageById({ id: messageId });
  if (!message) {
    return Response.json({ error: 'Message not found' }, { status: 404 });
  }

  const chat = await getChatById({ id: message.chatId });
  if (!chat || chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  return Response.json({ sources: message.sources ?? [] });
}
