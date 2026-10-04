export type StudySheetCitation = {
  documentId: string;
  documentName: string;
  page: number | null;
};

export type StudySheetSource = {
  documentId: string;
  documentName: string;
  pages: Array<number>;
};

export function collectStudySheetSources(
  sections: Array<{
    items: Array<{ citation?: StudySheetCitation }>;
  }>,
): Array<StudySheetSource> {
  const byDocument = new Map<string, StudySheetSource>();
  for (const item of sections.flatMap((section) => section.items)) {
    if (!item.citation) continue;
    const existing = byDocument.get(item.citation.documentId) ?? {
      documentId: item.citation.documentId,
      documentName: item.citation.documentName,
      pages: [],
    };
    if (
      item.citation.page !== null &&
      !existing.pages.includes(item.citation.page)
    ) {
      existing.pages.push(item.citation.page);
    }
    byDocument.set(item.citation.documentId, existing);
  }
  return [...byDocument.values()].map((source) => ({
    ...source,
    pages: source.pages.sort((left, right) => left - right),
  }));
}
