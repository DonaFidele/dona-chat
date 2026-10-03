import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import {
  createScheduleSlot,
  deleteScheduleSlot,
  getScheduleSlots,
  getSubjectById,
} from '@/lib/db/queries';

const paramsSchema = z.object({ id: z.string().uuid() });
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const createSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
    location: z.string().trim().max(160).optional(),
  })
  .refine((value) => value.startTime < value.endTime, {
    message: 'La fin doit être après le début',
  });

async function getOwnerSubject(params: Promise<{ id: string }>) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) return null;
  const subject = await getSubjectById({
    id: parsedParams.data.id,
    userId: session.user.id,
  });
  return subject ? { subject, userId: session.user.id } : null;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getOwnerSubject(params);
  if (!owner)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  return Response.json({
    slots: await getScheduleSlots({
      userId: owner.userId,
      subjectId: owner.subject.id,
    }),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getOwnerSubject(params);
  if (!owner)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  const payload = createSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!payload.success)
    return Response.json({ error: 'Créneau invalide' }, { status: 422 });
  return Response.json(
    {
      slot: await createScheduleSlot({
        ...payload.data,
        location: payload.data.location || null,
        userId: owner.userId,
        subjectId: owner.subject.id,
      }),
    },
    { status: 201 },
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getOwnerSubject(params);
  if (!owner)
    return Response.json({ error: 'Matière introuvable' }, { status: 404 });
  const slotId = z
    .string()
    .uuid()
    .safeParse(new URL(request.url).searchParams.get('id'));
  if (!slotId.success)
    return Response.json({ error: 'Créneau invalide' }, { status: 422 });
  const slot = await deleteScheduleSlot({
    id: slotId.data,
    userId: owner.userId,
    subjectId: owner.subject.id,
  });
  if (!slot)
    return Response.json({ error: 'Créneau introuvable' }, { status: 404 });
  return Response.json({ ok: true });
}
