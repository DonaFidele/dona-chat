import {
  embed,
  smoothStream,
  streamText,
  tool,
  type DataStreamWriter,
} from 'ai';
import type { Session } from 'next-auth';
import { z } from 'zod';
import { myProvider } from '@/lib/ai/providers';
import { saveDocument, searchSimilarChunks } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

export function createStudySheet({
  session,
  dataStream,
  subjectId,
  subjectName,
}: {
  session: Session;
  dataStream: DataStreamWriter;
  subjectId: string | null;
  subjectName: string | null;
}) {
  return tool({
    description:
      'Generate and save a detailed French study sheet for the current study subject. Use when the user asks for a fiche de révision, study sheet, structured summary, key concepts, or definitions for their current course.',
    parameters: z.object({
      focus: z
        .string()
        .optional()
        .describe(
          'Optional chapter, concept, or document focus requested by the user',
        ),
    }),
    execute: async ({ focus }) => {
      if (!session.user?.id || !subjectId || !subjectName) {
        return {
          error:
            'A study subject must be selected before creating a review sheet.',
        };
      }

      const { embedding } = await embed({
        model: myProvider.textEmbeddingModel('embedding-model'),
        value: focus || `Complete overview of ${subjectName}`,
      });
      const excerpts = await searchSimilarChunks({
        embedding,
        limit: 24,
        threshold: 0,
        userId: session.user.id,
        subjectId,
      });

      if (excerpts.length === 0) {
        return {
          error: 'No indexed document was found in this study subject.',
        };
      }

      const title = `Fiche de révision — ${subjectName}${focus ? ` : ${focus}` : ''}`;
      const id = generateUUID();
      const sourceContext = excerpts
        .map(
          (excerpt, index) =>
            `[Source ${index + 1}: ${decodeURIComponent(excerpt.resourceUri.split('/').at(-1) ?? excerpt.resourceUri)}]\n${excerpt.chunkContent}`,
        )
        .join('\n\n');

      dataStream.writeData({ type: 'kind', content: 'text' });
      dataStream.writeData({ type: 'id', content: id });
      dataStream.writeData({ type: 'title', content: title });
      dataStream.writeData({ type: 'clear', content: '' });

      let content = '';
      const { fullStream } = streamText({
        model: myProvider.languageModel('artifact-model'),
        system:
          'Tu es un assistant pédagogique. Rédige en français une fiche de révision exacte, approfondie et accessible uniquement à partir des extraits fournis. Utilise les sections : Vue d’ensemble, Points clés, Définitions importantes, Explications et exemples, À retenir pour l’examen, Sources utilisées. Ne crée aucune information absente des extraits. Cite les noms de fichiers dans la section Sources utilisées.',
        prompt: `Matière : ${subjectName}\nSujet demandé : ${focus ?? 'Fiche complète'}\n\nExtraits des documents du cours :\n${sourceContext}`,
        experimental_transform: smoothStream({ chunking: 'word' }),
      });

      for await (const delta of fullStream) {
        if (delta.type === 'text-delta') {
          content += delta.textDelta;
          dataStream.writeData({
            type: 'text-delta',
            content: delta.textDelta,
          });
        }
      }

      await saveDocument({
        id,
        title,
        content,
        kind: 'text',
        userId: session.user.id,
        subjectId,
      });
      dataStream.writeData({ type: 'finish', content: '' });

      return { id, title, sourcesUsed: excerpts.length };
    },
  });
}
