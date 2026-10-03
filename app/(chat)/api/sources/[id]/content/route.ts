import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { getResourceForUser } from '@/lib/db/queries';

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(
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
  if (!resource) {
    return Response.json({ error: 'Document introuvable' }, { status: 404 });
  }

  try {
    const storedFile = await fetch(resource.sourceUri);
    if (!storedFile.ok) {
      return Response.json(
        { error: 'Le fichier original est indisponible' },
        { status: 404 },
      );
    }

    return new Response(storedFile.body, {
      headers: {
        'Content-Type':
          resource.contentType ||
          storedFile.headers.get('content-type') ||
          'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(resource.originalName ?? 'document')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Unable to serve protected source:', error);
    return Response.json(
      { error: 'Le document ne peut pas être ouvert actuellement' },
      { status: 502 },
    );
  }
}
