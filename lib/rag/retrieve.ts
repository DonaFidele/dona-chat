import 'server-only';

import { embed } from 'ai';
import {
  getUploadedResourcesByUserId,
  searchSimilarChunks,
  searchTextChunks,
} from '@/lib/db/queries';
import { myProvider } from '@/lib/ai/providers';

const MAX_RETRIEVED_CHUNKS = 8;
const VECTOR_CANDIDATE_LIMIT = 30;
const RECIPROCAL_RANK_FUSION_K = 60;

function getDocumentName(sourceUri: string) {
  const encodedName = sourceUri.split('/').at(-1) ?? sourceUri;
  return decodeURIComponent(encodedName.replace(/^[0-9a-f-]{36}-/, ''));
}

function rewriteFollowUpQuery({
  query,
  history = [],
}: {
  query: string;
  history?: Array<string>;
}) {
  const normalizedQuery = query.trim();

  // A short follow-up benefits from the previous user question. This local
  // rewrite is deterministic, cheap and still works when the AI provider is
  // temporarily unavailable. The multilingual embedding model embeds the
  // resulting French or English query directly.
  if (normalizedQuery.length >= 48 || history.length === 0) {
    return normalizedQuery;
  }

  const previousQuestion = history
    .map((entry) => entry.trim())
    .filter(Boolean)
    .at(-1);

  return previousQuestion
    ? `${previousQuestion}\nSuivi : ${normalizedQuery}`
    : normalizedQuery;
}

export type RetrievedChunk = {
  id: string;
  documentId: string;
  documentName: string;
  sourceUri: string;
  text: string;
  page: number | null;
  similarity: number;
  vectorRank?: number;
  textRank?: number;
  fusedScore: number;
};

export type RetrievalResult = {
  hasDocuments: boolean;
  documentNames: Array<string>;
  rewrittenQuery: string;
  chunks: Array<RetrievedChunk>;
};

export async function retrieve({
  userId,
  subjectId,
  query,
  history,
  sourceName,
}: {
  userId: string;
  subjectId?: string | null;
  query: string;
  history?: Array<string>;
  sourceName?: string;
}): Promise<RetrievalResult> {
  const rewrittenQuery = rewriteFollowUpQuery({ query, history });

  if (!subjectId) {
    return {
      hasDocuments: false,
      documentNames: [],
      rewrittenQuery,
      chunks: [],
    };
  }

  const documents = await getUploadedResourcesByUserId({ userId, subjectId });
  const documentNames = documents.map((document) =>
    getDocumentName(document.sourceUri),
  );

  if (documents.length === 0) {
    return { hasDocuments: false, documentNames, rewrittenQuery, chunks: [] };
  }

  const { embedding } = await embed({
    model: myProvider.textEmbeddingModel('embedding-model'),
    value: rewrittenQuery,
  });

  // pgvector's <=> operator is cosine *distance* (lower is better). The
  // query helper converts it to 1 - distance, a similarity score, before
  // sorting. We deliberately do not cut low-scoring candidates here: they are
  // useful context and the model is instructed to label weak/absent evidence.
  const vectorCandidates = await searchSimilarChunks({
    embedding,
    limit: VECTOR_CANDIDATE_LIMIT,
    userId,
    subjectId,
    sourceName,
  });

  const textCandidates = await searchTextChunks({
    query: rewrittenQuery,
    limit: VECTOR_CANDIDATE_LIMIT,
    userId,
    subjectId,
    sourceName,
  });

  type Candidate = RetrievedChunk;
  const candidates = new Map<string, Candidate>();
  const addCandidate = (
    candidate: Omit<Candidate, 'vectorRank' | 'textRank' | 'fusedScore'>,
    kind: 'vector' | 'text',
    rank: number,
  ) => {
    const current = candidates.get(candidate.id) ?? {
      ...candidate,
      fusedScore: 0,
    };
    if (kind === 'vector') current.vectorRank = rank;
    else current.textRank = rank;
    candidates.set(candidate.id, current);
  };

  vectorCandidates.forEach((candidate, index) => {
    addCandidate(
      {
        id: candidate.chunkId,
        documentId: candidate.resourceId,
        documentName: getDocumentName(candidate.resourceUri),
        sourceUri: candidate.resourceUri,
        text: candidate.chunkContent,
        page: candidate.pageStart,
        similarity: candidate.similarity,
      },
      'vector',
      index + 1,
    );
  });
  textCandidates.forEach((candidate, index) => {
    addCandidate(
      {
        id: candidate.chunkId,
        documentId: candidate.resourceId,
        documentName: getDocumentName(candidate.resourceUri),
        sourceUri: candidate.resourceUri,
        text: candidate.chunkContent,
        page: candidate.pageStart,
        // Text-only hits have no cosine score. RRF still gives them their
        // ranking contribution and makes exact terms discoverable.
        similarity: 0,
      },
      'text',
      index + 1,
    );
  });

  const chunksPerSource = new Map<string, number>();
  const chunks = [...candidates.values()]
    .map((candidate) => ({
      ...candidate,
      fusedScore:
        (candidate.vectorRank
          ? 1 / (RECIPROCAL_RANK_FUSION_K + candidate.vectorRank)
          : 0) +
        (candidate.textRank
          ? 1 / (RECIPROCAL_RANK_FUSION_K + candidate.textRank)
          : 0),
    }))
    .sort((left, right) => right.fusedScore - left.fusedScore)
    .filter((candidate) => {
      const count = chunksPerSource.get(candidate.sourceUri) ?? 0;
      if (count >= 3) return false;
      chunksPerSource.set(candidate.sourceUri, count + 1);
      return true;
    })
    .slice(0, MAX_RETRIEVED_CHUNKS);

  if (process.env.NODE_ENV !== 'production') {
    console.info('[rag:retrieve]', {
      subjectId,
      rewrittenQuery,
      vectorCandidateCount: vectorCandidates.length,
      textCandidateCount: textCandidates.length,
      finalChunks: chunks.map((chunk) => ({
        id: chunk.id,
        document: chunk.documentName,
        similarity: Number(chunk.similarity.toFixed(3)),
        fusedScore: Number(chunk.fusedScore.toFixed(4)),
      })),
    });
  }

  return { hasDocuments: true, documentNames, rewrittenQuery, chunks };
}
