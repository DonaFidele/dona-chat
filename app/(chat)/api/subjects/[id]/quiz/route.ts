import { generateObject } from 'ai';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { myProvider } from '@/lib/ai/providers';
import { getCourseChunks, getSubjectById } from '@/lib/db/queries';

const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(8),
        answers: z.array(z.string().min(1)).length(4),
        correct: z.number().int().min(0).max(3),
      }),
    )
    .length(5),
});

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await params;
  const subject = await getSubjectById({ id, userId: session.user.id });
  if (!subject) {
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  }

  const chunks = await getCourseChunks({
    userId: session.user.id,
    subjectId: subject.id,
    limit: 15,
  });
  if (chunks.length === 0) {
    return Response.json(
      {
        error: 'Ajoutez au moins un document lisible avant de générer un quiz.',
      },
      { status: 400 },
    );
  }

  const context = chunks
    .map(
      (chunk) =>
        `--- DOCUMENT : ${decodeURIComponent(chunk.resourceUri.split('/').at(-1) ?? chunk.resourceUri)} ---\n${chunk.chunkContent.slice(0, 1400)}`,
    )
    .join('\n\n');

  const { object } = await generateObject({
    model: myProvider.languageModel('chat-model'),
    schema: quizSchema,
    system:
      'Tu es un enseignant. Génère exactement cinq QCM en français à partir EXCLUSIVEMENT du contexte documentaire fourni. Chaque question doit avoir quatre réponses et un seul bon index. N’utilise aucune connaissance générale, ne crée aucun fait absent du contexte, et varie les notions couvertes.',
    prompt: `Matière : ${subject.name}\n\nCONTEXTE DOCUMENTAIRE :\n${context}`,
  });

  return Response.json({
    questions: object.questions,
    subjectName: subject.name,
  });
}
