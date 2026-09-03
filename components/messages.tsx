import type { UIMessage } from 'ai';
import { PreviewMessage, ThinkingMessage } from './message';
import { Greeting } from './greeting';
import { memo, useMemo } from 'react';
import type { Vote } from '@/lib/db/schema';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { motion } from 'framer-motion';
import { useMessages } from '@/hooks/use-messages';

function getSourceNames(message: UIMessage) {
  return Array.from(
    new Set(
      message.parts
        ?.filter(
          (part) =>
            part.type === 'tool-invocation' &&
            part.toolInvocation.toolName === 'searchKnowledge' &&
            part.toolInvocation.state === 'result',
        )
        .flatMap((part) => {
          const result = (part as any).toolInvocation.result;
          return result?.results?.map((searchResult: any) => {
            const encodedName = searchResult.source?.split('/').at(-1) ?? '';
            return decodeURIComponent(
              encodedName.replace(/^[0-9a-f-]{36}-/, ''),
            );
          });
        }) ?? [],
    ),
  ).filter(Boolean) as Array<string>;
}

interface MessagesProps {
  chatId: string;
  status: UseChatHelpers['status'];
  votes: Array<Vote> | undefined;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isReadonly: boolean;
  isArtifactVisible: boolean;
}

function PureMessages({
  chatId,
  status,
  votes,
  messages,
  setMessages,
  reload,
  isReadonly,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  } = useMessages({
    chatId,
    status,
  });

  const sourceNamesByMessageId = useMemo(() => {
    const sourcesByMessageId = new Map<string, Array<string>>();
    let pendingSourceNames: Array<string> = [];

    for (const message of messages) {
      const ownSourceNames = getSourceNames(message);
      const hasText = message.parts?.some((part) => part.type === 'text');

      if (ownSourceNames.length > 0) {
        pendingSourceNames = Array.from(
          new Set([...pendingSourceNames, ...ownSourceNames]),
        );
      }

      if (message.role === 'assistant' && hasText) {
        sourcesByMessageId.set(message.id, pendingSourceNames);
        pendingSourceNames = [];
      }
    }

    return sourcesByMessageId;
  }, [messages]);

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll px-3 pt-8 relative md:px-6"
    >
      {messages.length === 0 && <Greeting />}

      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          chatId={chatId}
          message={message}
          isLoading={status === 'streaming' && messages.length - 1 === index}
          vote={
            votes
              ? votes.find((vote) => vote.messageId === message.id)
              : undefined
          }
          setMessages={setMessages}
          reload={reload}
          sourceNames={sourceNamesByMessageId.get(message.id) ?? []}
          isReadonly={isReadonly}
          requiresScrollPadding={
            hasSentMessage && index === messages.length - 1
          }
        />
      ))}

      {status === 'submitted' &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && <ThinkingMessage />}

      <motion.div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
        onViewportLeave={onViewportLeave}
        onViewportEnter={onViewportEnter}
      />
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) return true;

  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.status && nextProps.status) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  if (!equal(prevProps.votes, nextProps.votes)) return false;

  return true;
});
