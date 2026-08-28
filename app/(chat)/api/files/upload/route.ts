import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { getSubjectById } from '@/lib/db/queries';
import {
  CHAT_IMAGE_TYPES,
  isKnowledgeFile,
  MAX_UPLOAD_SIZE,
  indexUploadedFile,
} from '@/lib/rag/index-upload';

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= MAX_UPLOAD_SIZE, {
      message: 'File size should be less than 5MB',
    })
    .refine(
      (file) =>
        CHAT_IMAGE_TYPES.includes(
          file.type as (typeof CHAT_IMAGE_TYPES)[number],
        ) || isKnowledgeFile(file as File),
      {
        message: `Supported file types are JPEG, PNG, PDF, DOCX, TXT, CSV, JSON, MD and MDX`,
      },
    ),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const subjectId = formData.get('subjectId');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (subjectId !== null && typeof subjectId !== 'string') {
      return NextResponse.json({ error: 'Invalid subject' }, { status: 400 });
    }

    if (subjectId) {
      const selectedSubject = await getSubjectById({
        id: subjectId,
        userId: session.user.id,
      });

      if (!selectedSubject) {
        return NextResponse.json(
          { error: 'Subject not found' },
          { status: 404 },
        );
      }
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const filename = file.name;
    const fileBuffer = await file.arrayBuffer();

    try {
      const data = await put(
        `uploads/${session.user.id}/${randomUUID()}-${filename}`,
        fileBuffer,
        {
          access: 'public',
        },
      );

      const indexed = isKnowledgeFile(file);

      if (indexed) {
        const result = await indexUploadedFile({
          file,
          sourceUri: data.url,
          subjectId: subjectId || undefined,
        });

        return NextResponse.json({ ...data, indexed, chunks: result.chunks });
      }

      return NextResponse.json({ ...data, indexed });
    } catch (error) {
      console.error('Upload failed:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Upload failed' },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
