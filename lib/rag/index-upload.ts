import 'server-only';

import { embedMany } from 'ai';
import { createHash } from 'node:crypto';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import mammoth from 'mammoth';
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

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

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

// async function extractText(file: File): Promise<string> {
//   const buffer = Buffer.from(await file.arrayBuffer());

//   if (
//     file.type === 'application/pdf' ||
//     file.name.toLowerCase().endsWith('.pdf')
//   ) {
//     const pdfModule = await import('pdf-parse');
//     const pdfDefault = (pdfModule && (pdfModule as any).default) || pdfModule;

//     // Case A: default export is a function (pdf-parse exposes a function)
//     if (typeof pdfDefault === 'function') {
//       const result = await (pdfDefault as any)(buffer);
//       return result?.text ?? '';
//     }

//     // Case B: module exports a PDFParse class
//     if ((pdfModule as any).PDFParse) {
//       const Parser = (pdfModule as any).PDFParse;
//       const parser = new Parser({ data: buffer });
//       try {
//         const result = await parser.getText();
//         return result?.text ?? '';
//       } finally {
//         if (typeof parser.destroy === 'function') await parser.destroy();
//       }
//     }

//     throw new Error('Unsupported pdf-parse export format');
//   }

//   if (
//     file.type ===
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
//     file.name.toLowerCase().endsWith('.docx')
//   ) {
//     const result = await mammoth.extractRawText({ buffer });
//     return result.value;
//   }

//   const text = buffer.toString('utf8');

//   if (
//     file.type === 'application/json' ||
//     file.name.toLowerCase().endsWith('.json')
//   ) {
//     try {
//       return JSON.stringify(JSON.parse(text), null, 2);
//     } catch {
//       throw new Error('The JSON file is invalid');
//     }
//   }

//   return text;
// }

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  ) {
    const { extractText: extractPdfText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractPdfText(pdf, { mergePages: true });
    return text ?? '';
  }

  if (
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.toLowerCase().endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  const text = buffer.toString('utf8');

  if (
    file.type === 'application/json' ||
    file.name.toLowerCase().endsWith('.json')
  ) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      throw new Error('The JSON file is invalid');
    }
  }

  return text;
}

export async function indexUploadedFile({
  file,
  sourceUri,
}: {
  file: File;
  sourceUri: string;
}) {
  const content = (await extractText(file)).trim();

  if (!content) {
    throw new Error('No readable text was found in this file');
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitText(content);

  const { embeddings } = await embedMany({
    model: myProvider.textEmbeddingModel('embedding-model'),
    values: chunks,
  });

  await upsertResourceWithChunks({
    sourceUri,
    contentHash: createHash('sha256').update(content).digest('hex'),
    chunksWithEmbeddings: chunks.map((chunk, index) => ({
      content: chunk,
      embedding: embeddings[index],
    })),
  });

  return { chunks: chunks.length };
}
