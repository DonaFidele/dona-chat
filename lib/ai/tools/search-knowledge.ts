import { tool } from 'ai';
import { z } from 'zod';
import { retrieve, type RetrievedChunk } from '@/lib/rag/retrieve';

export type StudyRetrieval = {
  hasDocuments: boolean;
  documentNames: Array<string>;
  results: Array<{
    id: string;
    content: string;
    source: string;
    sourceType: string;
    similarity: number;
    documentId: string;
    documentName: string;
    page: number | null;
  }>;
};

function toStudyResult(chunk: RetrievedChunk) {
  return {
    id: chunk.id,
    content: chunk.text,
    source: chunk.sourceUri,
    sourceType: 'file',
    similarity: chunk.similarity,
    documentId: chunk.documentId,
    documentName: chunk.documentName,
    page: chunk.page,
  };
}

export async function retrieveStudyContext({
  query,
  userId,
  subjectId,
  history,
}: {
  query: string;
  userId: string;
  subjectId?: string | null;
  history?: Array<string>;
}): Promise<StudyRetrieval> {
  if (!subjectId) {
    return { hasDocuments: false, documentNames: [], results: [] };
  }

  const result = await retrieve({ query, userId, subjectId, history });

  return {
    hasDocuments: result.hasDocuments,
    documentNames: result.documentNames,
    results: result.chunks.map(toStudyResult),
  };
}

export function searchKnowledge({
  userId,
  subjectId,
}: {
  userId: string;
  subjectId?: string | null;
}) {
  return tool({
    description:
      "Search the current user's uploaded knowledge-base documents for information. Use sourceName to restrict the search to one specific uploaded file when the user names or selects a file.",
    parameters: z.object({
      query: z.string().describe('The information to find'),
      sourceName: z
        .string()
        .optional()
        .describe(
          'The name, or distinctive part of the name, of one uploaded file to search',
        ),
    }),
    execute: async ({ query, sourceName }) => {
      try {
        if (!subjectId) {
          return {
            resultType: 'knowledgeBaseResults',
            message:
              'No study subject is selected, so this conversation has no documents to search.',
            results: [],
          };
        }

        const retrieval = await retrieve({
          query,
          userId,
          subjectId,
          sourceName,
        });
        const results = retrieval.chunks;

        if (results.length === 0) {
          return {
            resultType: 'knowledgeBaseResults',
            message: 'No relevant information found in the knowledge base.',
            results: [],
          };
        }

        const formattedResults = results.map((result, index) => ({
          rank: index + 1,
          content: result.text,
          source: result.sourceUri,
          sourceType: 'file',
          similarity: result.similarity,
        }));

        return {
          resultType: 'knowledgeBaseResults',
          results: formattedResults,
        };
      } catch (error) {
        console.error('Knowledge search error:', error);
        return {
          resultType: 'knowledgeBaseResults',
          message: 'An error occurred while searching the knowledge base.',
          error: error instanceof Error ? error.message : 'Unknown error',
          results: [],
        };
      }
    },
  });
}
