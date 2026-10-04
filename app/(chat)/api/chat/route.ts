import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getStreamIdsByChatId,
  getSubjectById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { generateUUID, getTrailingMessageId } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import {
  retrieveStudyContext,
  searchKnowledge,
  type StudyRetrieval,
} from '@/lib/ai/tools/search-knowledge';
import { listKnowledgeFiles } from '@/lib/ai/tools/list-knowledge-files';
import { isProductionEnvironment, useTelemetry } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import type { Chat } from '@/lib/db/schema';
import { differenceInSeconds } from 'date-fns';
import { ChatSDKError } from '@/lib/errors';

export const maxDuration = 60;

function getVerifiedResponseSources({
  responseText,
  retrieval,
}: {
  responseText: string;
  retrieval: StudyRetrieval;
}) {
  const citedChunkIds = new Set(
    [...responseText.matchAll(/\[\[c:([0-9a-f-]{36})\]\]/gi)].map((match) =>
      match[1].toLowerCase(),
    ),
  );

  return retrieval.results
    .filter((result) => citedChunkIds.has(result.id.toLowerCase()))
    .map((result) => ({
      name: result.documentName,
      uri: result.source,
      similarity: result.similarity,
      chunkId: result.id,
      documentId: result.documentId,
      page: result.page,
      snippet: result.content.replace(/\s+/g, ' ').slice(0, 200),
    }));
}

function isTextMessagePart(
  value: unknown,
): value is { type: 'text'; text: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'text' &&
    'text' in value &&
    typeof value.text === 'string'
  );
}

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
      selectedSubjectId,
      answerLanguage,
      studyMode,
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });
    let subjectId: string | null = null;
    let subjectName: string | null = null;
    let subjectLanguage: 'auto' | 'fr' | 'en' = answerLanguage ?? 'auto';
    let subjectStudyMode: 'qa' | 'socratic' = studyMode ?? 'qa';

    if (!chat) {
      if (selectedSubjectId) {
        const selectedSubject = await getSubjectById({
          id: selectedSubjectId,
          userId: session.user.id,
        });

        if (!selectedSubject) {
          return new ChatSDKError('forbidden:chat').toResponse();
        }

        subjectId = selectedSubject.id;
        subjectName = selectedSubject.name;
        subjectLanguage = answerLanguage ?? selectedSubject.language;
        subjectStudyMode = studyMode ?? selectedSubject.studyMode;
      }

      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
        subjectId,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }

      subjectId = chat.subjectId;
      if (subjectId) {
        const selectedSubject = await getSubjectById({
          id: subjectId,
          userId: session.user.id,
        });
        subjectName = selectedSubject?.name ?? null;
        subjectLanguage = answerLanguage ?? selectedSubject?.language ?? 'auto';
        subjectStudyMode = studyMode ?? selectedSubject?.studyMode ?? 'qa';
      }
    }

    const previousMessages = await getMessagesByChatId({ id });

    const messages = appendClientMessage({
      // @ts-expect-error: todo add type conversion from DBMessage[] to UIMessage[]
      messages: previousMessages,
      message,
    });

    const question =
      message.parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('\n') || message.content;
    const retrievalHistory = previousMessages
      .filter((previousMessage) => previousMessage.role === 'user')
      .slice(-3)
      .map((previousMessage) => {
        const parts = Array.isArray(previousMessage.parts)
          ? previousMessage.parts
          : [];
        return parts
          .filter(isTextMessagePart)
          .map((part) => part.text)
          .join('\n');
      })
      .filter(Boolean);
    let retrieval: StudyRetrieval;
    try {
      retrieval = await retrieveStudyContext({
        query: question,
        userId: session.user.id,
        subjectId,
        history: retrievalHistory,
      });
    } catch (error) {
      // Retrieval must never make a chat unusable. The prompt receives an
      // empty documentary context and tells the tutor to disclose that the
      // explanation is based on general knowledge instead.
      console.error(
        'RAG retrieval failed; continuing without excerpts:',
        error,
      );
      retrieval = {
        hasDocuments: false,
        documentNames: [],
        results: [],
      };
    }
    const documentList = retrieval.documentNames.length
      ? retrieval.documentNames.map((name) => `- ${name}`).join('\n')
      : '- Aucun document';
    const excerpts = retrieval.results.length
      ? retrieval.results
          .map((result) => {
            const sourceName = decodeURIComponent(
              (result.source.split('/').at(-1) ?? result.source).replace(
                /^[0-9a-f-]{36}-/,
                '',
              ),
            );
            return `[c:${result.id}] ${sourceName}\n--- DÉBUT DE L’EXTRAIT ---\n${result.content.slice(0, 1200)}\n--- FIN DE L’EXTRAIT ---`;
          })
          .join('\n\n')
      : '';
    const retrievalContext = `
CONTEXTE DOCUMENTAIRE (autoritatif pour cette réponse)
Documents associés à cette conversation :
${documentList}

CONTEXTE :
${excerpts}

STATUT : ${retrieval.hasDocuments ? (retrieval.results.length ? 'EXTRAITS DISPONIBLES : leur score peut être faible, vérifie leur pertinence avant de les attribuer aux documents.' : 'AUCUN EXTRAIT RETOURNÉ : réponds avec des connaissances générales et la phrase de transparence prévue.') : 'AUCUN DOCUMENT ASSOCIÉ À CETTE CONVERSATION : réponds avec des connaissances générales et invite à ajouter le document concerné.'}`;
    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: message.experimental_attachments ?? [],
          sources: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    const stream = createDataStream({
      execute: (dataStream) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({
            selectedChatModel,
            requestHints,
            subjectName,
            retrievalContext,
            language: subjectLanguage,
            studyMode: subjectStudyMode,
          }),
          messages,
          maxSteps: 5,
          experimental_activeTools: [
            'searchKnowledge',
            'listKnowledgeFiles',
            'getWeather',
            'createDocument',
            'updateDocument',
            'requestSuggestions',
          ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            searchKnowledge: searchKnowledge({
              userId: session.user.id,
              subjectId,
            }),
            listKnowledgeFiles: listKnowledgeFiles({
              userId: session.user.id,
              subjectId,
            }),
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [message],
                  responseMessages: response.messages,
                });
                const responseSources = getVerifiedResponseSources({
                  responseText: JSON.stringify(assistantMessage.parts),
                  retrieval,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      sources: responseSources,
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (_) {
                console.error('Failed to save chat');
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment || useTelemetry,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () => stream),
      );
    } else {
      return new Response(stream);
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Anything that is not a ChatSDKError previously fell through here and the
    // handler returned undefined, so Next.js raised "No response is returned
    // from route handler" and the client saw an opaque 500 with no clue what
    // went wrong (an AI Gateway 429 surfaced this way). Log the real cause and
    // always return a Response.
    console.error('Unhandled error in POST /api/chat:', error);

    return new ChatSDKError('offline:chat').toResponse();
  }
}

export async function GET(request: Request) {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  let chat: Chat;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.visibility === 'private' && chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream,
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }

    if (mostRecentMessage.role !== 'assistant') {
      return new Response(emptyDataStream, { status: 200 });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: 'append-message',
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(restoredStream, { status: 200 });
  }

  return new Response(stream, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
