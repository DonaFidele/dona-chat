import 'server-only';

import { embedMany } from 'ai';
import { createHash } from 'node:crypto';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import mammoth from 'mammoth';
// Import the parser directly: the package entry point runs its demo code when
// bundled by Turbopack, which tries to read a non-existent test PDF.
// @ts-expect-error: pdf-parse does not expose typings for this internal entry.
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { myProvider } from '@/lib/ai/providers';
import { upsertResourceWithChunks } from '@/lib/db/queries';

export const CHAT_IMAGE_TYPES = ['image/jpeg', 'image/png'] as const;

export const KNOWLEDGE_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/json',
  'text/markdown',
] as const;

const KNOWLEDGE_FILE_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.txt',
  '.csv',
  '.json',
  '.md',
  '.mdx',
];

export const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;

export function isKnowledgeFileType(type: string) {
  return KNOWLEDGE_FILE_TYPES.includes(
    type as (typeof KNOWLEDGE_FILE_TYPES)[number],
  );
}

export function isKnowledgeFile(file: Pick<File, 'name' | 'type'>) {
  return (
    isKnowledgeFileType(file.type) ||
    KNOWLEDGE_FILE_EXTENSIONS.some((extension) =>
      file.name.toLowerCase().endsWith(extension),
    )
  );
}

type ExtractedSection = {
  content: string;
  page: number | null;
};

async function extractSections(file: File): Promise<Array<ExtractedSection>> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  ) {
    try {
      let pageNumber = 0;
      const result = await pdf(buffer, {
        pagerender: async (page: {
          getTextContent: () => Promise<{
            items: Array<{ str?: string; transform?: Array<number> }>;
          }>;
        }) => {
          pageNumber += 1;
          const textContent = await page.getTextContent();
          return textContent.items
            .map((item) => item.str ?? '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        },
      });
      const pages = String(result.text)
        .split(/\n\n/)
        .map((content, index) => ({ content: content.trim(), page: index + 1 }))
        .filter((section) => section.content.length > 0);

      return pages.length
        ? pages
        : [{ content: result.text.trim(), page: pageNumber || 1 }];
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';

      if (
        message.includes('xref') ||
        message.includes('command token too long') ||
        message.includes('illegal character')
      ) {
        throw new Error(
          'This PDF is malformed and cannot be read. Open it, then export or print it again as a new PDF before uploading it.',
        );
      }

      throw error;
    }
  }

  if (
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.toLowerCase().endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer });

    if (result.value.trim()) {
      return [{ content: result.value, page: null }];
    }

    const htmlResult = await mammoth.convertToHtml({ buffer });
    return [
      {
        content: htmlResult.value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '),
        page: null,
      },
    ];
  }

  const text = buffer.toString('utf8');

  if (
    file.type === 'application/json' ||
    file.name.toLowerCase().endsWith('.json')
  ) {
    try {
      return [
        { content: JSON.stringify(JSON.parse(text), null, 2), page: null },
      ];
    } catch {
      throw new Error('The JSON file is invalid');
    }
  }

  return [{ content: text, page: null }];
}

export async function indexUploadedFile({
  file,
  sourceUri,
  subjectId,
  userId,
}: {
  file: File;
  sourceUri: string;
  subjectId?: string;
  userId: string;
}) {
  const sections = await extractSections(file);
  const content = sections
    .map((section) => section.content)
    .join('\n\n')
    .trim();

  if (!content || sections.length === 0) {
    throw new Error('No readable text was found in this file');
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200,
    chunkOverlap: 250,
  });
  const chunksWithPages = (
    await Promise.all(
      sections.map(async (section) =>
        (
          await splitter.splitText(section.content)
        ).map((content) => ({
          content,
          pageStart: section.page,
          pageEnd: section.page,
        })),
      ),
    )
  ).flat();

  const embeddings: Array<number[]> = [];
  const embeddingBatchSize = 100;

  for (
    let index = 0;
    index < chunksWithPages.length;
    index += embeddingBatchSize
  ) {
    const { embeddings: batchEmbeddings } = await embedMany({
      model: myProvider.textEmbeddingModel('embedding-model'),
      values: chunksWithPages
        .slice(index, index + embeddingBatchSize)
        .map((chunk) => chunk.content),
    });
    embeddings.push(...batchEmbeddings);
  }

  await upsertResourceWithChunks({
    sourceUri,
    subjectId,
    contentHash: createHash('sha256').update(content).digest('hex'),
    chunksWithEmbeddings: chunksWithPages.map((chunk, index) => ({
      content: chunk.content,
      embedding: embeddings[index],
      pageStart: chunk.pageStart,
      pageEnd: chunk.pageEnd,
    })),
    userId,
    originalName: file.name,
    contentType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    pageCount:
      sections.filter((section) => section.page !== null).length || null,
  });

  return { chunks: chunksWithPages.length };
}
