import { tool } from 'ai';
import { z } from 'zod';
import { getUploadedResourcesByUserId } from '@/lib/db/queries';

function getFileName(sourceUri: string) {
  const encodedFileName = sourceUri.split('/').at(-1) ?? sourceUri;
  const fileName = encodedFileName.replace(/^[0-9a-f-]{36}-/, '');

  return decodeURIComponent(fileName);
}

export function listKnowledgeFiles({ userId }: { userId: string }) {
  return tool({
    description:
      'List every document uploaded by the current user to the knowledge base, including file names and upload dates. Use this for any question about uploaded files, including which files exist and which one was uploaded most recently.',
    parameters: z.object({}),
    execute: async () => {
      const resources = await getUploadedResourcesByUserId({ userId });

      const files = resources.map((resource) => ({
        name: getFileName(resource.sourceUri),
        uploadedAt: resource.createdAt.toISOString(),
      }));

      return {
        resultType: 'knowledgeFileList',
        totalFiles: files.length,
        latestFile: files.at(0) ?? null,
        files,
      };
    },
  });
}
