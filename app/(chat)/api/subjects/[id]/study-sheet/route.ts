import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import {
  getStudySheet,
  getSubjectById,
  getUploadedResourcesByUserId,
} from '@/lib/db/queries';

const paramsSchema = z.object({ id: z.string().uuid() });

async function getOwner(params: Promise<{ id: string }>) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) return null;
  const subject = await getSubjectById({
    id: parsed.data.id,
    userId: session.user.id,
  });
  return subject ? { userId: session.user.id, subject } : null;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getOwner(params);
  if (!owner) {
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  }
  const sheet = await getStudySheet({
    userId: owner.userId,
    subjectId: owner.subject.id,
  });
  const resources = await getUploadedResourcesByUserId({
    userId: owner.userId,
    subjectId: owner.subject.id,
  });
  return Response.json({
    sheet,
    status: owner.subject.studySheetStatus,
    documentsChanged:
      Boolean(sheet) &&
      sheet.generatedFromVersion < owner.subject.documentsVersion,
    readyDocuments: resources.filter((resource) => resource.status === 'ready')
      .length,
    processingDocuments: resources.filter(
      (resource) =>
        resource.status === 'pending' || resource.status === 'processing',
    ).length,
  });
}
