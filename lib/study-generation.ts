import 'server-only';

import { generateObject } from 'ai';
import { z } from 'zod';
import { myProvider } from '@/lib/ai/providers';
import type { StoredQuizQuestion, StudySheetSection } from '@/lib/db/schema';
import { getCourseChunks } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

const sectionKindSchema = z.enum([
  'definition',
  'formula',
  'theorem',
  'rule',
  'date_event',
  'person',
  'concept',
  'argument',
  'quote',
  'example',
  'method',
  'vocabulary',
  'grammar_rule',
  'chord_scale_notation',
  'doctrine_principle',
  'key_fact',
  'pitfall',
]);

const sheetPlanSchema = z.object({
  subjectType: z.string().min(2).max(80),
  sections: z
    .array(
      z.object({
        title: z.string().min(2).max(80),
        kind: sectionKindSchema,
        importance: z.enum(['high', 'medium']),
        why: z.string().min(2).max(240),
      }),
    )
    .min(1)
    .max(8),
});

const sheetExtractionSchema = z.object({
  sections: z
    .array(
      z.object({
        title: z.string().min(2).max(80),
        kind: sectionKindSchema,
        importance: z.enum(['high', 'medium']),
        items: z
          .array(
            z.object({
              text: z.string().min(3).max(520),
              importance: z.enum(['high', 'medium']),
              sourceIndex: z.number().int().min(1),
            }),
          )
          .min(1)
          .max(8),
      }),
    )
    .min(1)
    .max(8),
});

const quizGenerationSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(8).max(400),
        answers: z.array(z.string().min(1).max(280)).length(4),
        correct: z.number().int().min(0).max(3),
        explanation: z.string().min(3).max(500),
        sourceIndex: z.number().int().min(1),
      }),
    )
    .length(5),
});

type CourseChunk = Awaited<ReturnType<typeof getCourseChunks>>[number];

function localizedLanguage(language: 'auto' | 'fr' | 'en', fallback = 'fr') {
  return language === 'auto' ? fallback : language;
}

function documentName(sourceUri: string) {
  return decodeURIComponent(sourceUri.split('/').at(-1) ?? sourceUri).replace(
    /^[0-9a-f-]{36}-/,
    '',
  );
}

function buildContext(chunks: Array<CourseChunk>) {
  return chunks
    .map(
      (chunk, index) =>
        `[SOURCE ${index + 1}] ${documentName(chunk.resourceUri)}${chunk.pageStart ? `, p. ${chunk.pageStart}` : ''}\n${chunk.chunkContent.slice(0, 1500)}`,
    )
    .join('\n\n');
}

export async function getReadyCourseChunks({
  userId,
  subjectId,
}: {
  userId: string;
  subjectId: string;
}) {
  return getCourseChunks({ userId, subjectId, limit: 20 });
}

export async function generateAdaptiveStudySheet({
  userId,
  subjectId,
  subjectName,
  language,
}: {
  userId: string;
  subjectId: string;
  subjectName: string;
  language: 'auto' | 'fr' | 'en';
}): Promise<Array<StudySheetSection>> {
  const chunks = await getReadyCourseChunks({ userId, subjectId });
  if (chunks.length === 0) return [];

  const answerLanguage = localizedLanguage(language);
  const context = buildContext(chunks);
  const { object: plan } = await generateObject({
    model: myProvider.languageModel('chat-model'),
    schema: sheetPlanSchema,
    system: `You are a study-content analyst. Inspect only the document excerpts. Return 5 to 8 useful sections selected from what the documents actually emphasize. Do not use a fixed template. Titles must be in ${answerLanguage === 'fr' ? 'French' : 'English'}. Choose sections appropriate to the discipline: mathematics favors formulas, conditions and pitfalls; history favors dates, people, causes and consequences; programming favors algorithms, complexity and pitfalls. Skip any section unsupported by the excerpts.`,
    prompt: `Subject: ${subjectName}\n\n${context}`,
  });

  const { object: extraction } = await generateObject({
    model: myProvider.languageModel('chat-model'),
    schema: sheetExtractionSchema,
    system: `Create a concise flash study sheet in ${answerLanguage === 'fr' ? 'French' : 'English'} using only the supplied excerpts and the analysis plan. Keep 3 to 8 short items per useful section, no filler. Every item must have a valid sourceIndex. Mathematical formulas may use inline LaTex between $ delimiters.`,
    prompt: `Subject: ${subjectName}\nPlan: ${JSON.stringify(plan)}\n\n${context}`,
  });

  return extraction.sections
    .map((section) => ({
      id: generateUUID(),
      title: section.title,
      kind: section.kind,
      importance: section.importance,
      items: section.items
        .filter((item) => item.sourceIndex <= chunks.length)
        .map((item) => {
          const source = chunks[item.sourceIndex - 1];
          return {
            id: generateUUID(),
            text: item.text,
            importance: item.importance,
            citation: {
              chunkId: source.chunkId,
              documentId: source.resourceId,
              documentName: documentName(source.resourceUri),
              page: source.pageStart,
            },
          };
        })
        .filter((item) => item.text.length > 0),
    }))
    .filter((section) => section.items.length > 0);
}

export async function generateStoredQuiz({
  userId,
  subjectId,
  subjectName,
  language,
}: {
  userId: string;
  subjectId: string;
  subjectName: string;
  language: 'auto' | 'fr' | 'en';
}): Promise<Array<StoredQuizQuestion>> {
  const chunks = await getReadyCourseChunks({ userId, subjectId });
  if (chunks.length === 0) return [];
  const answerLanguage = localizedLanguage(language);
  const { object } = await generateObject({
    model: myProvider.languageModel('chat-model'),
    schema: quizGenerationSchema,
    system: `You are a teacher. Generate exactly five multiple-choice questions from only the document excerpts. Write in ${answerLanguage === 'fr' ? 'French' : 'English'}. Each question has four options, one correct answer, a short explanation and a valid sourceIndex. Never introduce facts absent from the excerpts.`,
    prompt: `Subject: ${subjectName}\n\n${buildContext(chunks)}`,
  });

  return object.questions
    .filter((question) => question.sourceIndex <= chunks.length)
    .map((question) => {
      const source = chunks[question.sourceIndex - 1];
      return {
        id: generateUUID(),
        question: question.question,
        answers: question.answers,
        correct: question.correct,
        explanation: question.explanation,
        source: {
          chunkId: source.chunkId,
          documentId: source.resourceId,
          name: documentName(source.resourceUri),
          page: source.pageStart,
          snippet: source.chunkContent.replace(/\s+/g, ' ').slice(0, 200),
        },
      };
    });
}
