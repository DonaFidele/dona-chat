import { embed, tool } from 'ai';
import { z } from 'zod';
import { searchSimilarChunks } from '@/lib/db/queries';
import { myProvider } from '../providers';

function getFileName(sourceUri: string) {
  const encodedName = sourceUri.split('/').at(-1) ?? sourceUri;
  return decodeURIComponent(encodedName.replace(/^[0-9a-f-]{36}-/, ''));
}

export type StudyRetrieval = {
  hasDocuments: boolean;
  documentNames: Array<string>;
  results: Array<{
    content: string;
    source: string;
    sourceType: string;
    similarity: number;
  }>;
};

export async function retrieveStudyContext({
  query,
  userId,
  subjectId,
}: {
  query: string;
  userId: string;
  subjectId?: string | null;
}): Promise<StudyRetrieval> {
  if (!subjectId) {
    return { hasDocuments: false, documentNames: [], results: [] };
  }

  const { getUploadedResourcesByUserId } = await import('@/lib/db/queries');
  const documents = await getUploadedResourcesByUserId({ userId, subjectId });
  const documentNames = documents.map((document) =>
    getFileName(document.sourceUri),
  );

  if (documents.length === 0) {
    return { hasDocuments: false, documentNames, results: [] };
  }

  const { embedding } = await embed({
    model: myProvider.textEmbeddingModel('embedding-model'),
    value: query,
  });
  const results = await searchSimilarChunks({
    embedding,
    limit: 12,
    threshold: 0.25,
    userId,
    subjectId,
  });
  const bestSimilarity = results[0]?.similarity ?? 0;
  const relevantSourceUris = new Set(
    Array.from(
      new Map(results.map((result) => [result.resourceUri, result])).values(),
    )
      .filter((result) => result.similarity >= bestSimilarity - 0.08)
      .slice(0, 4)
      .map((result) => result.resourceUri),
  );
  const relevantResults = results
    .filter((result) => relevantSourceUris.has(result.resourceUri))
    .slice(0, 8);

  return {
    hasDocuments: true,
    documentNames,
    results: relevantResults.map((result) => ({
      content: result.chunkContent,
      source: result.resourceUri,
      sourceType: result.resourceType,
      similarity: result.similarity,
    })),
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

        // Generate embedding for the search query
        const { embedding } = await embed({
          model: myProvider.textEmbeddingModel('embedding-model'),
          value: query,
        });

        // Search for similar chunks in the knowledge base
        const results = await searchSimilarChunks({
          embedding,
          limit: 24,
          threshold: 0.25,
          userId,
          sourceName,
          subjectId: subjectId ?? undefined,
        });

        if (results.length === 0) {
          return {
            resultType: 'knowledgeBaseResults',
            message: 'No relevant information found in the knowledge base.',
            results: [],
          };
        }

        const bestSimilarity = results[0]?.similarity ?? 0;
        const relevantSourceUris = new Set(
          Array.from(
            new Map(
              results.map((result) => [result.resourceUri, result]),
            ).values(),
          )
            .filter((result) => result.similarity >= bestSimilarity - 0.08)
            .slice(0, 4)
            .map((result) => result.resourceUri),
        );
        const relevantResults = results
          .filter((result) => relevantSourceUris.has(result.resourceUri))
          .slice(0, 8);

        const formattedResults = relevantResults.map((result, index) => ({
          rank: index + 1,
          content: result.chunkContent,
          source: result.resourceUri,
          sourceType: result.resourceType,
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
