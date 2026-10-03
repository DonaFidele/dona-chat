import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import {
  getResourceForUser,
  updateResourceIndexStatus,
} from '@/lib/db/queries';
import { indexUploadedFile } from '@/lib/rag/index-upload';

const paramsSchema = z.object({ id: z.string().uuid() });

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return Response.json({ error: 'Document invalide' }, { status: 400 });
  }

  const resource = await getResourceForUser({
    id: parsedParams.data.id,
    userId: session.user.id,
  });
  if (!resource?.subjectId) {
    return Response.json({ error: 'Document introuvable' }, { status: 404 });
  }

  await updateResourceIndexStatus({
    id: resource.id,
    userId: session.user.id,
    status: 'processing',
  });

  try {
    const sourceResponse = await fetch(resource.sourceUri);
    if (!sourceResponse.ok) {
      throw new Error('Le fichier original est indisponible');
    }

    const blob = await sourceResponse.blob();
    const file = new File([blob], resource.originalName ?? 'document', {
      type: resource.contentType ?? blob.type,
    });

    const result = await indexUploadedFile({
      file,
      sourceUri: resource.sourceUri,
      subjectId: resource.subjectId,
      userId: session.user.id,
    });

    return Response.json({ ok: true, chunks: result.chunks });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'La réindexation a échoué';
    await updateResourceIndexStatus({
      id: resource.id,
      userId: session.user.id,
      status: 'failed',
      errorMessage: message,
    });
    return Response.json({ error: message }, { status: 422 });
  }
}
