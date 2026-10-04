import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import {
  getStudySheet,
  getSubjectById,
  saveStudySheet,
} from '@/lib/db/queries';
import type { StudySheetSection } from '@/lib/db/schema';
import { generateUUID } from '@/lib/utils';

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({
  action: z.enum(['add', 'update', 'delete']),
  sectionId: z.string().uuid(),
  itemId: z.string().uuid().optional(),
  text: z.string().trim().min(1).max(520).optional(),
  importance: z.enum(['high', 'medium']).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  const parsedParams = paramsSchema.safeParse(await params);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsedParams.success || !body.success)
    return Response.json({ error: 'Modification invalide' }, { status: 422 });
  const subject = await getSubjectById({
    id: parsedParams.data.id,
    userId: session.user.id,
  });
  if (!subject)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  const sheet = await getStudySheet({
    userId: session.user.id,
    subjectId: subject.id,
  });
  if (!sheet)
    return Response.json({ error: 'Fiche introuvable' }, { status: 404 });
  const sections: Array<StudySheetSection> = sheet.sections.map((section) => ({
    ...section,
    items: [...section.items],
  }));
  const section = sections.find((item) => item.id === body.data.sectionId);
  if (!section)
    return Response.json({ error: 'Section introuvable' }, { status: 404 });

  if (body.data.action === 'add') {
    if (!body.data.text)
      return Response.json({ error: 'Texte requis' }, { status: 422 });
    section.items.push({
      id: generateUUID(),
      text: body.data.text,
      importance: body.data.importance ?? 'medium',
    });
  } else {
    if (!body.data.itemId)
      return Response.json({ error: 'Élément requis' }, { status: 422 });
    const itemIndex = section.items.findIndex(
      (item) => item.id === body.data.itemId,
    );
    if (itemIndex < 0)
      return Response.json({ error: 'Élément introuvable' }, { status: 404 });
    if (body.data.action === 'delete') section.items.splice(itemIndex, 1);
    else {
      if (!body.data.text)
        return Response.json({ error: 'Texte requis' }, { status: 422 });
      section.items[itemIndex] = {
        ...section.items[itemIndex],
        text: body.data.text,
        importance: body.data.importance ?? section.items[itemIndex].importance,
      };
    }
  }
  const updated = await saveStudySheet({
    userId: session.user.id,
    subjectId: subject.id,
    sections,
    generatedFromVersion: sheet.generatedFromVersion,
  });
  return Response.json({ sheet: updated });
}
