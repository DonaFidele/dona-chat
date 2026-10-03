'use client';

import type { Attachment, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, fetchWithErrorHandlers, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { Session } from 'next-auth';
import { useSearchParams } from 'next/navigation';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { ChatSDKError } from '@/lib/errors';
import { getActiveSubjectId, setActiveSubjectId } from '@/lib/study-subject';
import { QuizPanel, type QuizQuestion } from './quiz-panel';
import { StudyToolRail } from './study-tool-rail';
import { Button } from './ui/button';

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
  initialSubjectId,
  subjectName,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
  initialSubjectId?: string | null;
  subjectName?: string | null;
}) {
  const { mutate } = useSWRConfig();

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  useEffect(() => {
    if (initialSubjectId !== undefined) {
      setActiveSubjectId(initialSubjectId);
    }
  }, [initialSubjectId]);

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
    experimental_resume,
    data,
  } = useChat({
    id,
    initialMessages,
    experimental_throttle: 30,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    fetch: fetchWithErrorHandlers,
    experimental_prepareRequestBody: (body) => ({
      id,
      message: body.messages.at(-1),
      selectedChatModel: initialChatModel,
      selectedVisibilityType: visibilityType,
      selectedSubjectId: getActiveSubjectId() ?? initialSubjectId ?? null,
    }),
    onFinish: () => {
      window.history.replaceState({}, '', `/chat/${id}`);
      window.dispatchEvent(new Event('subjects-updated'));
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({
          type: 'error',
          description: error.message,
        });
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get('query');

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<Array<QuizQuestion>>([]);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);

  const generateQuiz = async () => {
    const subjectId = getActiveSubjectId() ?? initialSubjectId;
    if (!subjectId) {
      toast({
        type: 'error',
        description: 'Choisissez une matière avant de générer un quiz.',
      });
      return;
    }

    setIsQuizOpen(true);
    setQuizQuestions([]);
    setQuizError(null);
    setIsQuizLoading(true);

    try {
      const response = await fetch(`/api/subjects/${subjectId}/quiz`, {
        method: 'POST',
      });
      const result = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(result?.error ?? 'La génération du quiz a échoué.');
      setQuizQuestions(result.questions);
    } catch (error) {
      setQuizError(
        error instanceof Error
          ? error.message
          : 'La génération du quiz a échoué.',
      );
    } finally {
      setIsQuizLoading(false);
    }
  };

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      append({
        role: 'user',
        content: query,
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, append, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    experimental_resume,
    data,
    setMessages,
  });

  return (
    <>
      <div className="flex h-full min-h-0 min-w-0 bg-background">
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatHeader subjectName={subjectName} />

          <Messages
            chatId={id}
            status={status}
            votes={votes}
            messages={messages}
            setMessages={setMessages}
            reload={reload}
            isReadonly={isReadonly}
            isArtifactVisible={isArtifactVisible}
          />

          <form className="mx-auto flex w-full max-w-4xl gap-2 px-5 pb-4 pt-2 md:px-6 md:pb-5">
            {!isReadonly && (
              <MultimodalInput
                chatId={id}
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
                status={status}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                setMessages={setMessages}
                append={append}
                selectedVisibilityType={visibilityType}
              />
            )}
          </form>
        </div>
        <StudyToolRail
          onGenerateStudySheet={() =>
            append({
              role: 'user',
              content: 'Génère une fiche de révision complète pour ce cours.',
            })
          }
          onGenerateQuiz={() => void generateQuiz()}
        />
      </div>

      {isQuizOpen && (
        <div className="fixed inset-0 z-20 flex bg-background">
          {isQuizLoading && (
            <div className="m-auto text-sm text-muted-foreground">
              Génération des 5 questions à partir des documents du cours…
            </div>
          )}
          {quizError && (
            <div className="m-auto max-w-md space-y-4 text-center">
              <p className="text-sm text-destructive">{quizError}</p>
              <Button onClick={() => void generateQuiz()}>Réessayer</Button>
              <Button variant="ghost" onClick={() => setIsQuizOpen(false)}>
                Retour au chat
              </Button>
            </div>
          )}
          {!isQuizLoading && !quizError && quizQuestions.length === 5 && (
            <QuizPanel
              subjectName={subjectName ?? 'ce cours'}
              questions={quizQuestions}
              onBack={() => setIsQuizOpen(false)}
            />
          )}
        </div>
      )}

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
      />
    </>
  );
}
