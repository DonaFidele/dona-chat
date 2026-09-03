import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';
import { SubjectChatWrapper } from '@/components/subject-chat-wrapper';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { getSubjectById } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

export const instant = false;

export default async function SubjectChatPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/guest');

  const { subject: subjectId } = await searchParams;
  if (!subjectId) redirect('/');

  const subject = await getSubjectById({
    id: subjectId,
    userId: session.user.id,
  });
  if (!subject) notFound();

  const cookieStore = await cookies();
  const initialChatModel =
    cookieStore.get('chat-model')?.value ?? DEFAULT_CHAT_MODEL;

  return (
    <SubjectChatWrapper
      chatId={generateUUID()}
      initialChatModel={initialChatModel}
      initialMessages={[]}
      initialSubjectId={subject.id}
      subjectName={subject.name}
      session={session}
    />
  );
}
