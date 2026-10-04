import 'server-only';

import {
  and,
  asc,
  cosineDistance,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  like,
  lt,
  or,
  type SQL,
  sql,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  stream,
  subject,
  resource,
  resourceChunk,
  subjectShare,
  note,
  savedQuestion,
  scheduleSlot,
  studySheet,
  studyQuiz,
  quizAttempt,
  type StudySheetSection,
  type StoredQuizQuestion,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '../errors';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const dbClient = drizzle(client);

type DatabaseConnection = typeof dbClient;
export type TransactionType = Parameters<
  Parameters<DatabaseConnection['transaction']>[0]
>[0];

export async function transaction<T>(
  callback: (tx: TransactionType) => Promise<T>,
) {
  return await dbClient.transaction(async (tx: TransactionType) => {
    return await callback(tx);
  });
}

export async function getUser(
  email: string,
  txn?: DatabaseConnection,
): Promise<Array<User>> {
  const db = txn || dbClient;
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    );
  }
}

export async function createUser(
  email: string,
  password: string,
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

export async function createGuestUser(txn?: DatabaseConnection) {
  const db = txn || dbClient;
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create guest user',
    );
  }
}

export async function saveChat(
  {
    id,
    userId,
    title,
    visibility,
    subjectId,
  }: {
    id: string;
    userId: string;
    title: string;
    visibility: VisibilityType;
    subjectId?: string | null;
  },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
      subjectId,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function createSubject({
  name,
  description,
  color,
  teacher,
  examDate,
  explanationLevel,
  language,
  studyMode,
  userId,
}: {
  name: string;
  description?: string | null;
  color?: string | null;
  teacher?: string | null;
  examDate?: string | null;
  explanationLevel?: 'normal' | 'simple' | 'eli12';
  language?: 'auto' | 'fr' | 'en';
  studyMode?: 'qa' | 'socratic';
  userId: string;
}) {
  try {
    const [createdSubject] = await dbClient
      .insert(subject)
      .values({
        name,
        description,
        color,
        teacher,
        examDate,
        explanationLevel,
        language,
        studyMode,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return createdSubject;
  } catch (error) {
    console.error('Failed to create subject:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to create subject');
  }
}

export async function getSubjectById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    const [selectedSubject] = await dbClient
      .select()
      .from(subject)
      .where(and(eq(subject.id, id), eq(subject.userId, userId)));

    return selectedSubject;
  } catch (error) {
    console.error('Failed to get subject:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to get subject');
  }
}

export async function createSubjectShare({
  subjectId,
  scope,
  expiresAt,
}: { subjectId: string; scope: 'read' | 'comment'; expiresAt: Date }) {
  const [share] = await dbClient
    .insert(subjectShare)
    .values({ subjectId, scope, expiresAt })
    .returning();
  return share;
}

export async function getActiveSubjectShare(token: string) {
  const [share] = await dbClient
    .select()
    .from(subjectShare)
    .where(
      and(
        eq(subjectShare.token, token),
        sql`${subjectShare.revokedAt} IS NULL`,
        gt(subjectShare.expiresAt, new Date()),
      ),
    );
  if (share)
    await dbClient
      .update(subjectShare)
      .set({ lastAccessedAt: new Date() })
      .where(eq(subjectShare.token, token));
  return share;
}

export async function getSubjectForShare(id: string) {
  const [result] = await dbClient
    .select({
      id: subject.id,
      name: subject.name,
      description: subject.description,
      color: subject.color,
      createdAt: subject.createdAt,
    })
    .from(subject)
    .where(eq(subject.id, id));
  return result;
}

export async function revokeSubjectShare({
  token,
  subjectId,
}: { token: string; subjectId: string }) {
  const [share] = await dbClient
    .update(subjectShare)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(subjectShare.token, token), eq(subjectShare.subjectId, subjectId)),
    )
    .returning();
  return share;
}

export async function getSubjectsByUserId({ userId }: { userId: string }) {
  try {
    const subjects = await dbClient
      .select({
        id: subject.id,
        name: subject.name,
        description: subject.description,
        color: subject.color,
        teacher: subject.teacher,
        examDate: subject.examDate,
        explanationLevel: subject.explanationLevel,
        language: subject.language,
        studyMode: subject.studyMode,
        createdAt: subject.createdAt,
        documentCount: count(resource.id),
      })
      .from(subject)
      .leftJoin(resource, eq(resource.subjectId, subject.id))
      .where(
        and(eq(subject.userId, userId), sql`${subject.archivedAt} IS NULL`),
      )
      .groupBy(subject.id)
      .orderBy(desc(subject.createdAt));

    return await Promise.all(
      subjects.map(async (item) => {
        const [latestChat] = await dbClient
          .select({ id: chat.id })
          .from(chat)
          .where(and(eq(chat.userId, userId), eq(chat.subjectId, item.id)))
          .orderBy(desc(chat.createdAt))
          .limit(1);

        return { ...item, latestChatId: latestChat?.id ?? null };
      }),
    );
  } catch (error) {
    console.error('Failed to get subjects:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to get subjects');
  }
}

export async function updateSubject({
  id,
  userId,
  name,
  description,
  color,
  teacher,
  examDate,
  explanationLevel,
  language,
  studyMode,
}: {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  teacher?: string | null;
  examDate?: string | null;
  explanationLevel?: 'normal' | 'simple' | 'eli12';
  language?: 'auto' | 'fr' | 'en';
  studyMode?: 'qa' | 'socratic';
}) {
  const [updated] = await dbClient
    .update(subject)
    .set({
      name,
      description,
      color,
      teacher,
      examDate,
      explanationLevel,
      language,
      studyMode,
      updatedAt: new Date(),
    })
    .where(and(eq(subject.id, id), eq(subject.userId, userId)))
    .returning();
  return updated;
}

export async function updateSubjectStudySettings({
  id,
  userId,
  language,
  studyMode,
}: {
  id: string;
  userId: string;
  language?: 'auto' | 'fr' | 'en';
  studyMode?: 'qa' | 'socratic';
}) {
  const [updated] = await dbClient
    .update(subject)
    .set({ language, studyMode, updatedAt: new Date() })
    .where(and(eq(subject.id, id), eq(subject.userId, userId)))
    .returning();
  return updated;
}

export async function updateSubjectGenerationStatus({
  id,
  userId,
  kind,
  status,
}: {
  id: string;
  userId: string;
  kind: 'studySheet' | 'quiz';
  status: 'none' | 'generating' | 'ready' | 'failed';
}) {
  const [updated] = await dbClient
    .update(subject)
    .set(
      kind === 'studySheet'
        ? { studySheetStatus: status, updatedAt: new Date() }
        : { quizStatus: status, updatedAt: new Date() },
    )
    .where(and(eq(subject.id, id), eq(subject.userId, userId)))
    .returning();
  return updated;
}

export async function archiveSubject({
  id,
  userId,
}: { id: string; userId: string }) {
  const [archived] = await dbClient
    .update(subject)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(subject.id, id), eq(subject.userId, userId)))
    .returning();
  return archived;
}

export async function restoreSubject({
  id,
  userId,
}: { id: string; userId: string }) {
  const [restored] = await dbClient
    .update(subject)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(and(eq(subject.id, id), eq(subject.userId, userId)))
    .returning();
  return restored;
}

export async function getStudyNotes({
  userId,
  subjectId,
}: {
  userId: string;
  subjectId: string;
}) {
  return dbClient
    .select()
    .from(note)
    .where(and(eq(note.userId, userId), eq(note.subjectId, subjectId)))
    .orderBy(desc(note.starred), desc(note.updatedAt));
}

export async function createStudyNote({
  userId,
  subjectId,
  content,
}: {
  userId: string;
  subjectId: string;
  content: string;
}) {
  const [createdNote] = await dbClient
    .insert(note)
    .values({ userId, subjectId, content })
    .returning();
  return createdNote;
}

export async function updateStudyNote({
  id,
  userId,
  subjectId,
  content,
  starred,
}: {
  id: string;
  userId: string;
  subjectId: string;
  content?: string;
  starred?: boolean;
}) {
  const [updatedNote] = await dbClient
    .update(note)
    .set({ content, starred, updatedAt: new Date() })
    .where(
      and(
        eq(note.id, id),
        eq(note.userId, userId),
        eq(note.subjectId, subjectId),
      ),
    )
    .returning();
  return updatedNote;
}

export async function deleteStudyNote({
  id,
  userId,
  subjectId,
}: {
  id: string;
  userId: string;
  subjectId: string;
}) {
  const [deletedNote] = await dbClient
    .delete(note)
    .where(
      and(
        eq(note.id, id),
        eq(note.userId, userId),
        eq(note.subjectId, subjectId),
      ),
    )
    .returning();
  return deletedNote;
}

export async function getSavedQuestions({
  userId,
  subjectId,
}: {
  userId: string;
  subjectId: string;
}) {
  return dbClient
    .select()
    .from(savedQuestion)
    .where(
      and(
        eq(savedQuestion.userId, userId),
        eq(savedQuestion.subjectId, subjectId),
      ),
    )
    .orderBy(asc(savedQuestion.resolved), desc(savedQuestion.createdAt));
}

export async function createSavedQuestion({
  userId,
  subjectId,
  question,
}: {
  userId: string;
  subjectId: string;
  question: string;
}) {
  const [createdQuestion] = await dbClient
    .insert(savedQuestion)
    .values({ userId, subjectId, question })
    .returning();
  return createdQuestion;
}

export async function updateSavedQuestion({
  id,
  userId,
  subjectId,
  resolved,
}: {
  id: string;
  userId: string;
  subjectId: string;
  resolved: boolean;
}) {
  const [updatedQuestion] = await dbClient
    .update(savedQuestion)
    .set({ resolved })
    .where(
      and(
        eq(savedQuestion.id, id),
        eq(savedQuestion.userId, userId),
        eq(savedQuestion.subjectId, subjectId),
      ),
    )
    .returning();
  return updatedQuestion;
}

export async function getScheduleSlots({
  userId,
  subjectId,
}: {
  userId: string;
  subjectId: string;
}) {
  return dbClient
    .select()
    .from(scheduleSlot)
    .where(
      and(
        eq(scheduleSlot.userId, userId),
        eq(scheduleSlot.subjectId, subjectId),
      ),
    )
    .orderBy(asc(scheduleSlot.weekday), asc(scheduleSlot.startTime));
}

export async function createScheduleSlot({
  userId,
  subjectId,
  weekday,
  startTime,
  endTime,
  location,
}: {
  userId: string;
  subjectId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  location?: string | null;
}) {
  const [createdSlot] = await dbClient
    .insert(scheduleSlot)
    .values({ userId, subjectId, weekday, startTime, endTime, location })
    .returning();
  return createdSlot;
}

export async function deleteScheduleSlot({
  id,
  userId,
  subjectId,
}: {
  id: string;
  userId: string;
  subjectId: string;
}) {
  const [deletedSlot] = await dbClient
    .delete(scheduleSlot)
    .where(
      and(
        eq(scheduleSlot.id, id),
        eq(scheduleSlot.userId, userId),
        eq(scheduleSlot.subjectId, subjectId),
      ),
    )
    .returning();
  return deletedSlot;
}

export async function getStudySheet({
  userId,
  subjectId,
}: {
  userId: string;
  subjectId: string;
}) {
  const [result] = await dbClient
    .select()
    .from(studySheet)
    .where(
      and(eq(studySheet.userId, userId), eq(studySheet.subjectId, subjectId)),
    );
  return result;
}

export async function saveStudySheet({
  userId,
  subjectId,
  sections,
  generatedFromVersion,
}: {
  userId: string;
  subjectId: string;
  sections: Array<StudySheetSection>;
  generatedFromVersion: number;
}) {
  const [result] = await dbClient
    .insert(studySheet)
    .values({ userId, subjectId, sections, generatedFromVersion })
    .onConflictDoUpdate({
      target: studySheet.subjectId,
      set: { sections, generatedFromVersion, updatedAt: new Date() },
    })
    .returning();
  return result;
}

export async function getStudyQuiz({
  userId,
  subjectId,
}: {
  userId: string;
  subjectId: string;
}) {
  const [result] = await dbClient
    .select()
    .from(studyQuiz)
    .where(
      and(eq(studyQuiz.userId, userId), eq(studyQuiz.subjectId, subjectId)),
    );
  return result;
}

export async function saveStudyQuiz({
  userId,
  subjectId,
  questions,
  generatedFromVersion,
}: {
  userId: string;
  subjectId: string;
  questions: Array<StoredQuizQuestion>;
  generatedFromVersion: number;
}) {
  const [result] = await dbClient
    .insert(studyQuiz)
    .values({ userId, subjectId, questions, generatedFromVersion })
    .onConflictDoUpdate({
      target: studyQuiz.subjectId,
      set: { questions, generatedFromVersion, updatedAt: new Date() },
    })
    .returning();
  return result;
}

export async function getInProgressQuizAttempt({
  userId,
  subjectId,
  quizId,
}: {
  userId: string;
  subjectId: string;
  quizId: string;
}) {
  const [result] = await dbClient
    .select()
    .from(quizAttempt)
    .where(
      and(
        eq(quizAttempt.userId, userId),
        eq(quizAttempt.subjectId, subjectId),
        eq(quizAttempt.quizId, quizId),
        eq(quizAttempt.status, 'in_progress'),
      ),
    )
    .orderBy(desc(quizAttempt.startedAt))
    .limit(1);
  return result;
}

export async function createQuizAttempt({
  userId,
  subjectId,
  quizId,
  total,
  questionIndexes = [],
}: {
  userId: string;
  subjectId: string;
  quizId: string;
  total: number;
  questionIndexes?: Array<number>;
}) {
  const [result] = await dbClient
    .insert(quizAttempt)
    .values({
      userId,
      subjectId,
      quizId,
      total,
      questionIndexes,
      answers: [],
    })
    .returning();
  return result;
}

export async function saveQuizAttemptProgress({
  id,
  userId,
  subjectId,
  answers,
}: {
  id: string;
  userId: string;
  subjectId: string;
  answers: Array<number | null>;
}) {
  const [result] = await dbClient
    .update(quizAttempt)
    .set({ answers })
    .where(
      and(
        eq(quizAttempt.id, id),
        eq(quizAttempt.userId, userId),
        eq(quizAttempt.subjectId, subjectId),
        eq(quizAttempt.status, 'in_progress'),
      ),
    )
    .returning();
  return result;
}

export async function getQuizAttemptForUser({
  id,
  userId,
  subjectId,
}: {
  id: string;
  userId: string;
  subjectId: string;
}) {
  const [result] = await dbClient
    .select()
    .from(quizAttempt)
    .where(
      and(
        eq(quizAttempt.id, id),
        eq(quizAttempt.userId, userId),
        eq(quizAttempt.subjectId, subjectId),
      ),
    );
  return result;
}

export async function finishQuizAttempt({
  id,
  userId,
  subjectId,
  answers,
  score,
  total,
  percent,
  durationSeconds,
}: {
  id: string;
  userId: string;
  subjectId: string;
  answers: Array<number | null>;
  score: number;
  total: number;
  percent: number;
  durationSeconds: number;
}) {
  const [result] = await dbClient
    .update(quizAttempt)
    .set({
      answers,
      score,
      total,
      percent,
      durationSeconds,
      status: 'finished',
      finishedAt: new Date(),
    })
    .where(
      and(
        eq(quizAttempt.id, id),
        eq(quizAttempt.userId, userId),
        eq(quizAttempt.subjectId, subjectId),
        eq(quizAttempt.status, 'in_progress'),
      ),
    )
    .returning();
  return result;
}

export async function getQuizAttemptRanking({
  userId,
  subjectId,
}: {
  userId: string;
  subjectId: string;
}) {
  return dbClient
    .select()
    .from(quizAttempt)
    .where(
      and(
        eq(quizAttempt.userId, userId),
        eq(quizAttempt.subjectId, subjectId),
        eq(quizAttempt.status, 'finished'),
      ),
    )
    .orderBy(desc(quizAttempt.percent), asc(quizAttempt.durationSeconds));
}

export async function getQuizAttemptHistory({
  userId,
  subjectId,
}: {
  userId: string;
  subjectId: string;
}) {
  return dbClient
    .select()
    .from(quizAttempt)
    .where(
      and(
        eq(quizAttempt.userId, userId),
        eq(quizAttempt.subjectId, subjectId),
        eq(quizAttempt.status, 'finished'),
      ),
    )
    .orderBy(desc(quizAttempt.finishedAt));
}

export async function getQuizLeaderboard({ quizId }: { quizId: string }) {
  const attempts = await dbClient
    .select({
      userId: quizAttempt.userId,
      displayName: user.displayName,
      score: quizAttempt.score,
      total: quizAttempt.total,
      percent: quizAttempt.percent,
      durationSeconds: quizAttempt.durationSeconds,
    })
    .from(quizAttempt)
    .innerJoin(user, eq(quizAttempt.userId, user.id))
    .where(
      and(
        eq(quizAttempt.quizId, quizId),
        eq(quizAttempt.status, 'finished'),
        eq(user.showOnLeaderboard, true),
        sql`${user.displayName} IS NOT NULL`,
      ),
    )
    .orderBy(desc(quizAttempt.percent), asc(quizAttempt.durationSeconds));

  const bestAttemptByUser = new Map<string, (typeof attempts)[number]>();
  for (const attempt of attempts) {
    if (!bestAttemptByUser.has(attempt.userId)) {
      bestAttemptByUser.set(attempt.userId, attempt);
    }
  }
  return [...bestAttemptByUser.values()];
}

export async function permanentlyDeleteSubject({
  id,
  userId,
}: { id: string; userId: string }) {
  const [deleted] = await dbClient
    .delete(subject)
    .where(and(eq(subject.id, id), eq(subject.userId, userId)))
    .returning();
  return deleted;
}

export async function deleteChatById(
  { id }: { id: string },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function getChatsByUserId(
  {
    id,
    limit,
    startingAfter,
    endingBefore,
  }: {
    id: string;
    limit: number;
    startingAfter: string | null;
    endingBefore: string | null;
  },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    );
  }
}

export async function getChatById(
  { id }: { id: string },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages(
  {
    messages,
  }: {
    messages: Array<DBMessage>;
  },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId(
  { id }: { id: string },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get messages by chat id',
    );
  }
}

export async function voteMessage(
  {
    chatId,
    messageId,
    type,
  }: {
    chatId: string;
    messageId: string;
    type: 'up' | 'down';
  },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId(
  { id }: { id: string },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    );
  }
}

export async function saveDocument(
  {
    id,
    title,
    kind,
    content,
    userId,
    subjectId,
  }: {
    id: string;
    title: string;
    kind: ArtifactKind;
    content: string;
    userId: string;
    subjectId?: string | null;
  },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        subjectId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getReviewSheetsBySubject({
  userId,
  subjectId,
}: {
  userId: string;
  subjectId: string;
}) {
  try {
    return await dbClient
      .select({
        id: document.id,
        title: document.title,
        createdAt: document.createdAt,
      })
      .from(document)
      .where(
        and(eq(document.userId, userId), eq(document.subjectId, subjectId)),
      )
      .orderBy(desc(document.createdAt));
  } catch (error) {
    console.error('Failed to get review sheets:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get review sheets',
    );
  }
}

export async function getDocumentsById(
  { id }: { id: string },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    );
  }
}

export async function getDocumentById(
  { id }: { id: string },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp(
  {
    id,
    timestamp,
  }: {
    id: string;
    timestamp: Date;
  },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

export async function saveSuggestions(
  {
    suggestions,
  }: {
    suggestions: Array<Suggestion>;
  },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save suggestions',
    );
  }
}

export async function getSuggestionsByDocumentId(
  {
    documentId,
  }: {
    documentId: string;
  },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    );
  }
}

export async function getMessageById(
  { id }: { id: string },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp(
  {
    chatId,
    timestamp,
  }: {
    chatId: string;
    timestamp: Date;
  },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
  }
}

export async function updateChatVisiblityById(
  {
    chatId,
    visibility,
  }: {
    chatId: string;
    visibility: 'private' | 'public';
  },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function getMessageCountByUserId(
  { id, differenceInHours }: { id: string; differenceInHours: number },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

export async function createStreamId(
  {
    streamId,
    chatId,
  }: {
    streamId: string;
    chatId: string;
  },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

export async function getStreamIdsByChatId(
  { chatId }: { chatId: string },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}

// Vector search functions for RAG
export async function searchSimilarChunks(
  {
    embedding,
    limit = 20,
    userId,
    sourceName,
    subjectId,
  }: {
    embedding: number[];
    limit?: number;
    userId?: string;
    sourceName?: string;
    subjectId?: string;
  },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  try {
    const similarity = sql<number>`1 - (${cosineDistance(resourceChunk.embedding, embedding)})`;
    const candidateLimit = sourceName ? limit : limit * 4;

    const results = await db
      .select({
        chunkId: resourceChunk.id,
        chunkContent: resourceChunk.content,
        pageStart: resourceChunk.pageStart,
        resourceId: resource.id,
        resourceType: resource.sourceType,
        resourceUri: resource.sourceUri,
        resourceCreatedAt: resource.createdAt,
        resourceUpdatedAt: resource.updatedAt,
        similarity,
      })
      .from(resourceChunk)
      .innerJoin(resource, eq(resourceChunk.resourceId, resource.id))
      .where(
        and(
          userId
            ? or(
                eq(resource.userId, userId),
                and(
                  isNull(resource.userId),
                  like(resource.sourceUri, `%/uploads/${userId}/%`),
                ),
              )
            : undefined,
          sourceName ? like(resource.sourceUri, `%${sourceName}%`) : undefined,
          subjectId ? eq(resource.subjectId, subjectId) : undefined,
          eq(resource.status, 'ready'),
        ),
      )
      .orderBy((t) => desc(t.similarity))
      .limit(candidateLimit);

    const chunksPerSource = new Map<string, number>();

    return results
      .filter((result) => {
        const count = chunksPerSource.get(result.resourceUri) ?? 0;
        if (count >= 3) return false;

        chunksPerSource.set(result.resourceUri, count + 1);
        return true;
      })
      .slice(0, limit);
  } catch (error) {
    console.error('Vector search error:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search similar chunks',
    );
  }
}

/**
 * Textual candidates complement vector search. The `search_vector` generated
 * column is created by migration 0018. If an older database does not have it
 * yet, this safely returns no text candidates and vector search still works.
 */
export async function searchTextChunks(
  {
    query,
    limit = 30,
    userId,
    subjectId,
    sourceName,
  }: {
    query: string;
    limit?: number;
    userId: string;
    subjectId: string;
    sourceName?: string;
  },
  txn?: DatabaseConnection,
) {
  const db = txn || dbClient;
  const textQuery = query.trim();

  if (!textQuery) return [];

  try {
    const rank = sql<number>`ts_rank_cd("ResourceChunk"."search_vector", websearch_to_tsquery('simple', ${textQuery}))`;

    return await db
      .select({
        chunkId: resourceChunk.id,
        chunkContent: resourceChunk.content,
        pageStart: resourceChunk.pageStart,
        resourceId: resource.id,
        resourceUri: resource.sourceUri,
        rank,
      })
      .from(resourceChunk)
      .innerJoin(resource, eq(resourceChunk.resourceId, resource.id))
      .where(
        and(
          or(
            eq(resource.userId, userId),
            and(
              isNull(resource.userId),
              like(resource.sourceUri, `%/uploads/${userId}/%`),
            ),
          ),
          eq(resource.subjectId, subjectId),
          eq(resource.status, 'ready'),
          sourceName ? like(resource.sourceUri, `%${sourceName}%`) : undefined,
          sql`"ResourceChunk"."search_vector" @@ websearch_to_tsquery('simple', ${textQuery})`,
        ),
      )
      .orderBy((fields) => desc(fields.rank))
      .limit(limit);
  } catch (error) {
    console.warn(
      'Full-text search unavailable; using vector results only:',
      error,
    );
    return [];
  }
}

export async function getCourseChunks({
  userId,
  subjectId,
  limit = 15,
}: {
  userId: string;
  subjectId: string;
  limit?: number;
}) {
  try {
    const candidates = await dbClient
      .select({
        chunkId: resourceChunk.id,
        chunkContent: resourceChunk.content,
        pageStart: resourceChunk.pageStart,
        resourceId: resource.id,
        resourceType: resource.sourceType,
        resourceUri: resource.sourceUri,
      })
      .from(resourceChunk)
      .innerJoin(resource, eq(resourceChunk.resourceId, resource.id))
      .where(
        and(
          or(
            eq(resource.userId, userId),
            and(
              isNull(resource.userId),
              like(resource.sourceUri, `%/uploads/${userId}/%`),
            ),
          ),
          eq(resource.subjectId, subjectId),
          eq(resource.status, 'ready'),
        ),
      )
      .orderBy(desc(resource.updatedAt))
      .limit(limit * 5);

    const chunksPerSource = new Map<string, number>();

    return candidates
      .filter((candidate) => {
        const count = chunksPerSource.get(candidate.resourceUri) ?? 0;
        if (count >= 3) return false;

        chunksPerSource.set(candidate.resourceUri, count + 1);
        return true;
      })
      .slice(0, limit);
  } catch (error) {
    console.error('Course chunk retrieval error:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get course document chunks',
    );
  }
}

export async function getResourceForUser({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  const [selectedResource] = await dbClient
    .select()
    .from(resource)
    .where(
      and(
        eq(resource.id, id),
        or(
          eq(resource.userId, userId),
          and(
            isNull(resource.userId),
            like(resource.sourceUri, `%/uploads/${userId}/%`),
          ),
        ),
      ),
    );

  return selectedResource;
}

export async function updateResourceIndexStatus({
  id,
  userId,
  status,
  errorMessage,
}: {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  errorMessage?: string | null;
}) {
  const [updatedResource] = await dbClient
    .update(resource)
    .set({ status, errorMessage: errorMessage ?? null, updatedAt: new Date() })
    .where(
      and(
        eq(resource.id, id),
        or(
          eq(resource.userId, userId),
          and(
            isNull(resource.userId),
            like(resource.sourceUri, `%/uploads/${userId}/%`),
          ),
        ),
      ),
    )
    .returning();

  return updatedResource;
}

export async function getUploadedResourcesByUserId({
  userId,
  limit = 500,
  subjectId,
}: {
  userId: string;
  limit?: number;
  subjectId?: string;
}) {
  try {
    return await dbClient
      .select({
        id: resource.id,
        sourceUri: resource.sourceUri,
        createdAt: resource.createdAt,
        originalName: resource.originalName,
        contentType: resource.contentType,
        sizeBytes: resource.sizeBytes,
        pageCount: resource.pageCount,
        status: resource.status,
        errorMessage: resource.errorMessage,
      })
      .from(resource)
      .where(
        and(
          or(
            eq(resource.userId, userId),
            and(
              isNull(resource.userId),
              like(resource.sourceUri, `%/uploads/${userId}/%`),
            ),
          ),
          subjectId ? eq(resource.subjectId, subjectId) : undefined,
        ),
      )
      .orderBy(desc(resource.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get uploaded resources:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get uploaded resources',
    );
  }
}

export async function removeResourceFromSubject({
  resourceId,
  subjectId,
  userId,
}: {
  resourceId: string;
  subjectId: string;
  userId: string;
}) {
  try {
    const [updatedResource] = await dbClient
      .update(resource)
      .set({ subjectId: null, updatedAt: new Date() })
      .where(
        and(
          eq(resource.id, resourceId),
          eq(resource.subjectId, subjectId),
          or(
            eq(resource.userId, userId),
            and(
              isNull(resource.userId),
              like(resource.sourceUri, `%/uploads/${userId}/%`),
            ),
          ),
        ),
      )
      .returning({ id: resource.id });

    return updatedResource;
  } catch (error) {
    console.error('Failed to remove resource from subject:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to remove resource from subject',
    );
  }
}

export async function upsertResourceWithChunks({
  sourceUri,
  contentHash,
  chunksWithEmbeddings,
  subjectId,
  userId,
  originalName,
  contentType,
  sizeBytes,
  pageCount,
}: {
  sourceUri: string;
  contentHash: string;
  chunksWithEmbeddings: Array<{
    content: string;
    embedding: number[];
    pageStart: number | null;
    pageEnd: number | null;
  }>;
  subjectId?: string;
  userId: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  pageCount: number | null;
}) {
  try {
    await dbClient.transaction(async (tx) => {
      const [existingResource] = await tx
        .select()
        .from(resource)
        .where(eq(resource.sourceUri, sourceUri));

      let resourceId = existingResource?.id;

      if (resourceId) {
        await tx
          .delete(resourceChunk)
          .where(eq(resourceChunk.resourceId, resourceId));
        await tx
          .update(resource)
          .set({
            contentHash,
            subjectId,
            userId,
            originalName,
            contentType,
            sizeBytes,
            pageCount,
            status: 'ready',
            errorMessage: null,
            updatedAt: new Date(),
          })
          .where(eq(resource.id, resourceId));
      } else {
        const [createdResource] = await tx
          .insert(resource)
          .values({
            sourceType: 'file',
            sourceUri,
            contentHash,
            userId,
            subjectId,
            originalName,
            contentType,
            sizeBytes,
            pageCount,
            status: 'ready',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning({ id: resource.id });

        if (!createdResource) {
          throw new Error('Failed to create resource');
        }

        resourceId = createdResource.id;
      }

      await tx.insert(resourceChunk).values(
        chunksWithEmbeddings.map((chunk) => ({
          resourceId,
          content: chunk.content,
          embedding: chunk.embedding,
          userId,
          subjectId,
          pageStart: chunk.pageStart,
          pageEnd: chunk.pageEnd,
          tokenCount: Math.ceil(chunk.content.length / 4),
        })),
      );

      if (subjectId) {
        await tx
          .update(subject)
          .set({
            documentsVersion: sql`${subject.documentsVersion} + 1`,
            updatedAt: new Date(),
          })
          .where(and(eq(subject.id, subjectId), eq(subject.userId, userId)));
      }
    });
  } catch (error) {
    console.error('Failed to index uploaded resource:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to index uploaded resource',
    );
  }
}
