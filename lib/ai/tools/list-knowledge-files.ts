import { tool } from 'ai';
import { z } from 'zod';
import { getUploadedResourcesByUserId } from '@/lib/db/queries';

function getFileName(sourceUri: string) {
  const encodedFileName = sourceUri.split('/').at(-1) ?? sourceUri;
  const fileName = encodedFileName.replace(/^[0-9a-f-]{36}-/, '');

  return decodeURIComponent(fileName);
}

export function listKnowledgeFiles({
  userId,
  subjectId,
}: {
  userId: string;
  subjectId?: string | null;
}) {
  return tool({
    description:
      'List every document uploaded by the current user to the knowledge base, including file names and upload dates. Use this for any question about uploaded files, including which files exist and which one was uploaded most recently.',
    parameters: z.object({}),
    execute: async () => {
      const resources = await getUploadedResourcesByUserId({
        userId,
        subjectId: subjectId ?? undefined,
      });

      const files = resources.map((resource) => ({
        position: resources.indexOf(resource) + 1,
        name: getFileName(resource.sourceUri),
        uploadedAt: resource.createdAt.toISOString(),
      }));

      return {
        resultType: 'knowledgeFileList',
        totalFiles: files.length,
        ordering: 'newest upload first; position 1 is the most recent file',
        latestFile: files.at(0) ?? null,
        files,
      };
    },
  });
}
