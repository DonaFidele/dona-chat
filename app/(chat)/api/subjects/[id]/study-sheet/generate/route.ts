import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import {
  getStudySheet,
  getSubjectById,
  getUploadedResourcesByUserId,
  saveStudySheet,
  updateSubjectGenerationStatus,
} from '@/lib/db/queries';
import { generateAdaptiveStudySheet } from '@/lib/study-generation';

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({ force: z.boolean().optional().default(false) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const parsedParams = paramsSchema.safeParse(await params);
  const parsedBody = bodySchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsedParams.success || !parsedBody.success) {
    return Response.json({ error: 'Requête invalide' }, { status: 422 });
  }
  const subject = await getSubjectById({
    id: parsedParams.data.id,
    userId: session.user.id,
  });
  if (!subject) {
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  }
  const resources = await getUploadedResourcesByUserId({
    userId: session.user.id,
    subjectId: subject.id,
  });
  const readyDocuments = resources.filter(
    (resource) => resource.status === 'ready',
  );
  if (readyDocuments.length === 0) {
    const processing = resources.some(
      (resource) =>
        resource.status === 'pending' || resource.status === 'processing',
    );
    return Response.json(
      {
        code: processing ? 'DOCUMENTS_PROCESSING' : 'NO_DOCUMENTS',
        message: processing
          ? 'Les documents sont encore en cours de traitement.'
          : 'Ajoutez un document lisible avant de générer une fiche.',
      },
      { status: 409 },
    );
  }

  const existing = await getStudySheet({
    userId: session.user.id,
    subjectId: subject.id,
  });
  if (existing && !parsedBody.data.force) {
    return Response.json({ sheet: existing, alreadyExisted: true });
  }

  try {
    await updateSubjectGenerationStatus({
      id: subject.id,
      userId: session.user.id,
      kind: 'studySheet',
      status: 'generating',
    });
    const sections = await generateAdaptiveStudySheet({
      userId: session.user.id,
      subjectId: subject.id,
      subjectName: subject.name,
      language: subject.language,
    });
    if (sections.length === 0) {
      await updateSubjectGenerationStatus({
        id: subject.id,
        userId: session.user.id,
        kind: 'studySheet',
        status: 'failed',
      });
      return Response.json(
        {
          code: 'NO_DOCUMENTS',
          message: 'Aucun extrait lisible n’a été trouvé.',
        },
        { status: 409 },
      );
    }
    const sheet = await saveStudySheet({
      userId: session.user.id,
      subjectId: subject.id,
      sections,
      generatedFromVersion: subject.documentsVersion,
    });
    await updateSubjectGenerationStatus({
      id: subject.id,
      userId: session.user.id,
      kind: 'studySheet',
      status: 'ready',
    });
    return Response.json({ sheet, alreadyExisted: false });
  } catch (error) {
    console.error('Study-sheet generation failed:', error);
    await updateSubjectGenerationStatus({
      id: subject.id,
      userId: session.user.id,
      kind: 'studySheet',
      status: 'failed',
    });
    return Response.json(
      {
        code: 'GENERATION_FAILED',
        message: 'La fiche n’a pas pu être générée. Réessayez.',
      },
      { status: 422 },
    );
  }
}
