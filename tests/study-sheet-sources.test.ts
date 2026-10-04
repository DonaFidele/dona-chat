import { expect, test } from '@playwright/test';
import { collectStudySheetSources } from '@/lib/study-sheet-sources';

test('groups eight citations into four consecutively numbered documents', () => {
  const sections = [
    {
      items: Array.from({ length: 8 }, (_, index) => ({
        citation: {
          documentId: `document-${index % 4}`,
          documentName: `Document ${index % 4}`,
          page: index + 1,
        },
      })),
    },
  ];

  const sources = collectStudySheetSources(sections);

  expect(sources).toHaveLength(4);
  expect(sources.map((source) => source.documentId)).toEqual([
    'document-0',
    'document-1',
    'document-2',
    'document-3',
  ]);
  expect(sources.map((source) => source.pages)).toEqual([
    [1, 5],
    [2, 6],
    [3, 7],
    [4, 8],
  ]);
});
