import type { Session } from 'next-auth';
import type { UIMessage } from 'ai';
import { Chat } from './chat';
import { DataStreamHandler } from './data-stream-handler';
import type { VisibilityType } from './visibility-selector';

export function SubjectChatWrapper({
  chatId,
  initialChatModel,
  initialMessages,
  initialSubjectId,
  session,
  subjectName,
}: {
  chatId: string;
  initialChatModel: string;
  initialMessages: Array<UIMessage>;
  initialSubjectId: string;
  session: Session;
  subjectName: string;
}) {
  return (
    <>
      <Chat
        id={chatId}
        initialMessages={initialMessages}
        initialChatModel={initialChatModel}
        initialVisibilityType={'private' as VisibilityType}
        isReadonly={false}
        session={session}
        autoResume={false}
        initialSubjectId={initialSubjectId}
        subjectName={subjectName}
      />
      <DataStreamHandler id={chatId} />
    </>
  );
}
