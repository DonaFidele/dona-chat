'use client';

import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

type Source = {
  documentId?: string;
  name: string;
  page?: number | null;
  snippet?: string;
};

export function SourceViewerPanel({ source }: { source: Source | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!source?.documentId) {
      setUrl(null);
      setText(null);
      return;
    }

    let objectUrl: string | null = null;
    const controller = new AbortController();
    setUrl(null);
    setText(null);
    setError(null);

    void fetch(`/api/sources/${source.documentId}/content`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error('Le document ne peut pas être ouvert');
        const blob = await response.blob();
        if (blob.type === 'application/pdf') {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
          return;
        }
        setText(await blob.text());
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError')
          return;
        setError(reason instanceof Error ? reason.message : 'Erreur inconnue');
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source?.documentId]);

  if (!source?.documentId) {
    return (
      <p className="text-sm text-muted-foreground">
        Sélectionnez une citation pour ouvrir sa source.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium">{source.name}</p>
        {source.page && (
          <p className="text-sm text-muted-foreground">Page {source.page}</p>
        )}
      </div>
      {source.snippet && (
        <blockquote className="border-l-2 border-primary pl-3 text-sm text-muted-foreground">
          {source.snippet}
        </blockquote>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!url && !text && !error && (
        <LoaderCircle
          className="animate-spin text-muted-foreground"
          aria-label="Ouverture du document"
        />
      )}
      {url && (
        <iframe
          className="h-[60dvh] w-full rounded border bg-white"
          title={source.name}
          src={`${url}#page=${source.page ?? 1}`}
        />
      )}
      {text && (
        <pre className="max-h-[60dvh] overflow-auto whitespace-pre-wrap rounded border p-3 text-xs">
          {text}
        </pre>
      )}
    </div>
  );
}
