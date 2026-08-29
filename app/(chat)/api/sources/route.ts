import { auth } from '@/app/(auth)/auth';
import {
  getSubjectById,
  getUploadedResourcesByUserId,
  removeResourceFromSubject,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import type { NextRequest } from 'next/server';

function getFileName(sourceUri: string) {
  const encodedFileName = sourceUri.split('/').at(-1) ?? sourceUri;
  return decodeURIComponent(encodedFileName.replace(/^[0-9a-f-]{36}-/, ''));
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const subjectId = request.nextUrl.searchParams.get('subjectId') ?? undefined;

  if (subjectId) {
    const selectedSubject = await getSubjectById({
      id: subjectId,
      userId: session.user.id,
    });

    if (!selectedSubject) {
      return Response.json({ error: 'Subject not found' }, { status: 404 });
    }
  }

  const resources = await getUploadedResourcesByUserId({
    userId: session.user.id,
    subjectId,
  });

  return Response.json({
    sources: resources.map((resource, index) => ({
      id: resource.id,
      position: index + 1,
      name: getFileName(resource.sourceUri),
      uploadedAt: resource.createdAt,
    })),
  });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const resourceId = request.nextUrl.searchParams.get('id');
  const subjectId = request.nextUrl.searchParams.get('subjectId');

  if (!resourceId || !subjectId) {
    return Response.json(
      { error: 'A document and a subject are required' },
      { status: 400 },
    );
  }

  const removedResource = await removeResourceFromSubject({
    resourceId,
    subjectId,
    userId: session.user.id,
  });

  if (!removedResource) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  return Response.json({ ok: true });
}
