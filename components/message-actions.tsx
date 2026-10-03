import type { Message } from 'ai';
import { useSWRConfig } from 'swr';
import { useCopyToClipboard } from 'usehooks-ts';

import type { Vote } from '@/lib/db/schema';
import { FileIcon } from './icons';

import { CopyIcon, ThumbDownIcon, ThumbUpIcon } from './icons';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { memo } from 'react';
import equal from 'fast-deep-equal';
import { toast } from 'sonner';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils';

type PersistedSource = {
  name: string;
  uri?: string;
  similarity?: number;
  documentId?: string;
  page?: number | null;
  snippet?: string;
};

type MessageSourcesResponse = { sources: Array<PersistedSource> };

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
  sourceNames = [],
}: {
  chatId: string;
  message: Message;
  vote: Vote | undefined;
  isLoading: boolean;
  sourceNames?: Array<string>;
}) {
  const { mutate } = useSWRConfig();
  const [_, copyToClipboard] = useCopyToClipboard();
  const { data: persistedSources } = useSWR<MessageSourcesResponse>(
    !isLoading && message.role === 'assistant'
      ? `/api/message-sources?messageId=${encodeURIComponent(message.id)}`
      : null,
    fetcher,
    {
      refreshInterval: (latestData) => (latestData ? 0 : 1000),
      shouldRetryOnError: false,
    },
  );
  const persistedSourceNames = persistedSources?.sources.map(
    (source) => source.name,
  );
  const displayedSourceNames = persistedSourceNames ?? sourceNames;
  const displayedSources: Array<PersistedSource> =
    persistedSources?.sources ?? sourceNames.map((name) => ({ name }));

  if (isLoading) return null;
  if (message.role === 'user') return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-row gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              className="py-1 px-2 h-fit text-muted-foreground"
              variant="outline"
              onClick={async () => {
                const textFromParts = message.parts
                  ?.filter((part) => part.type === 'text')
                  .map((part) => part.text)
                  .join('\n')
                  .trim();

                if (!textFromParts) {
                  toast.error("There's no text to copy!");
                  return;
                }

                await copyToClipboard(textFromParts);
                toast.success('Copied to clipboard!');
              }}
            >
              <CopyIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              data-testid="message-upvote"
              className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
              disabled={vote?.isUpvoted}
              variant="outline"
              onClick={async () => {
                const upvote = fetch('/api/vote', {
                  method: 'PATCH',
                  body: JSON.stringify({
                    chatId,
                    messageId: message.id,
                    type: 'up',
                  }),
                });

                toast.promise(upvote, {
                  loading: 'Upvoting Response...',
                  success: () => {
                    mutate<Array<Vote>>(
                      `/api/vote?chatId=${chatId}`,
                      (currentVotes) => {
                        if (!currentVotes) return [];

                        const votesWithoutCurrent = currentVotes.filter(
                          (vote) => vote.messageId !== message.id,
                        );

                        return [
                          ...votesWithoutCurrent,
                          {
                            chatId,
                            messageId: message.id,
                            isUpvoted: true,
                          },
                        ];
                      },
                      { revalidate: false },
                    );

                    return 'Upvoted Response!';
                  },
                  error: 'Failed to upvote response.',
                });
              }}
            >
              <ThumbUpIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upvote Response</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              data-testid="message-downvote"
              className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
              variant="outline"
              disabled={vote && !vote.isUpvoted}
              onClick={async () => {
                const downvote = fetch('/api/vote', {
                  method: 'PATCH',
                  body: JSON.stringify({
                    chatId,
                    messageId: message.id,
                    type: 'down',
                  }),
                });

                toast.promise(downvote, {
                  loading: 'Downvoting Response...',
                  success: () => {
                    mutate<Array<Vote>>(
                      `/api/vote?chatId=${chatId}`,
                      (currentVotes) => {
                        if (!currentVotes) return [];

                        const votesWithoutCurrent = currentVotes.filter(
                          (vote) => vote.messageId !== message.id,
                        );

                        return [
                          ...votesWithoutCurrent,
                          {
                            chatId,
                            messageId: message.id,
                            isUpvoted: false,
                          },
                        ];
                      },
                      { revalidate: false },
                    );

                    return 'Downvoted Response!';
                  },
                  error: 'Failed to downvote response.',
                });
              }}
            >
              <ThumbDownIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Downvote Response</TooltipContent>
        </Tooltip>
        {displayedSourceNames.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                className="py-1 px-2 h-fit text-muted-foreground"
                variant="outline"
                onClick={() => {
                  const source = displayedSources[0];
                  if (!source?.documentId) return;
                  window.dispatchEvent(
                    new CustomEvent('open-source-viewer', {
                      detail: source,
                    }),
                  );
                }}
                disabled={!displayedSources.some((source) => source.documentId)}
              >
                <FileIcon size={14} />
                {displayedSourceNames.length}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="mb-1 font-medium">
                Documents utiles à cette réponse
              </p>
              <ul className="list-disc space-y-2 pl-4">
                {displayedSources.map((source, index) => (
                  <li key={`${source.name}-${index}`}>
                    <button
                      type="button"
                      className="text-left underline-offset-2 hover:underline disabled:no-underline"
                      disabled={!source.documentId}
                      onClick={() => {
                        if (!source.documentId) return;
                        window.dispatchEvent(
                          new CustomEvent('open-source-viewer', {
                            detail: source,
                          }),
                        );
                      }}
                    >
                      {source.name}
                      {source.page ? ` · p. ${source.page}` : ''}
                    </button>
                    {source.snippet && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {source.snippet}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (!equal(prevProps.sourceNames, nextProps.sourceNames)) return false;

    return true;
  },
);
