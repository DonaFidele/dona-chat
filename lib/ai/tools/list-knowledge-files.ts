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
      'List the documents uploaded by the current user to the knowledge base, including their file names and upload dates. Use this when the user asks which files or documents they uploaded.',
    parameters: z.object({}),
    execute: async () => {
      const resources = await getUploadedResourcesByUserId({ userId });

      return {
        resultType: 'knowledgeFileList',
        files: resources.map((resource) => ({
          name: getFileName(resource.sourceUri),
          uploadedAt: resource.createdAt.toISOString(),
        })),
      };
    },
  });
}
