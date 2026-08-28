import { embed, tool } from 'ai';
import { z } from 'zod';
import { searchSimilarChunks } from '@/lib/db/queries';
import { myProvider } from '../providers';

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
        // Generate embedding for the search query
        const { embedding } = await embed({
          model: myProvider.textEmbeddingModel('embedding-model'),
          value: query,
        });

        // Search for similar chunks in the knowledge base
        const results = await searchSimilarChunks({
          embedding,
          limit: 10,
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

        const formattedResults = results.map((result, index) => ({
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
