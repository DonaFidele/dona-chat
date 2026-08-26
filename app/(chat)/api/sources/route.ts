import { auth } from '@/app/(auth)/auth';
import { getUploadedResourcesByUserId } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

function getFileName(sourceUri: string) {
  const encodedFileName = sourceUri.split('/').at(-1) ?? sourceUri;
  return decodeURIComponent(encodedFileName.replace(/^[0-9a-f-]{36}-/, ''));
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const resources = await getUploadedResourcesByUserId({
    userId: session.user.id,
  });

  return Response.json({
    sources: resources.map((resource) => ({
      name: getFileName(resource.sourceUri),
      uploadedAt: resource.createdAt,
    })),
  });
}
