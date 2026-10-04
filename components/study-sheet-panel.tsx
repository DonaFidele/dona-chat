'use client';

import {
  ChevronDown,
  ChevronUp,
  FileText,
  LoaderCircle,
  Maximize2,
  Pencil,
  Printer,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';
import { collectStudySheetSources } from '@/lib/study-sheet-sources';
import { fetcher } from '@/lib/utils';
import { Button } from './ui/button';

type Citation = {
  documentId: string;
  documentName: string;
  page: number | null;
  chunkId: string;
};
type SheetItem = {
  id: string;
  text: string;
  importance: 'high' | 'medium';
  citation?: Citation;
};
type Sheet = {
  id: string;
  sections: Array<{
    id: string;
    title: string;
    kind: string;
    importance: 'high' | 'medium';
    items: Array<SheetItem>;
  }>;
  generatedFromVersion: number;
};
type SheetState = {
  sheet: Sheet | null;
  status: string;
  readyDocuments: number;
  processingDocuments: number;
  documentsChanged: boolean;
};

export function StudySheetPanel({
  subjectId,
  onExpand,
}: { subjectId: string | null | undefined; onExpand: () => void }) {
  const url = subjectId ? `/api/subjects/${subjectId}/study-sheet` : null;
  const { data, mutate } = useSWR<SheetState>(url, fetcher);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{
    sectionId: string;
    itemId?: string;
    text: string;
    importance: 'high' | 'medium';
  } | null>(null);
  if (!subjectId)
    return (
      <p className="text-sm text-muted-foreground">
        Choisissez une matière pour générer une fiche.
      </p>
    );

  const generate = async (force = false) => {
    if (!url) return;
    if (
      force &&
      !window.confirm(
        'Regénérer la fiche remplacera les modifications actuelles. Continuer ?',
      )
    )
      return;
    setError(null);
    setIsGenerating(true);
    try {
      const response = await fetch(`${url}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          payload?.message ?? 'La fiche n’a pas pu être générée.',
        );
      await mutate();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'La fiche n’a pas pu être générée.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const saveItem = async () => {
    if (!url || !editingItem || !editingItem.text.trim()) return;
    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch(`${url}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingItem.itemId ? 'update' : 'add',
          sectionId: editingItem.sectionId,
          itemId: editingItem.itemId,
          text: editingItem.text,
          importance: editingItem.importance,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? 'La fiche n’a pas pu être modifiée.');
      }
      setEditingItem(null);
      await mutate();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'La fiche n’a pas pu être modifiée.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (sectionId: string, itemId: string) => {
    if (!url || !window.confirm('Supprimer cet élément de la fiche ?')) return;
    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch(`${url}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', sectionId, itemId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? 'La fiche n’a pas pu être modifiée.');
      }
      await mutate();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'La fiche n’a pas pu être modifiée.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isGenerating)
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <LoaderCircle size={16} className="animate-spin" /> Génération de la
        fiche…
      </div>
    );
  if (error)
    return (
      <div className="space-y-3 rounded-md border border-destructive/40 p-4 text-sm">
        <p>{error}</p>
        <Button onClick={() => void generate()}>Réessayer</Button>
      </div>
    );
  if (!data)
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <LoaderCircle size={16} className="animate-spin" /> Chargement de la
        fiche…
      </div>
    );
  if (!data.sheet) {
    const processing = data.processingDocuments > 0;
    return (
      <div className="space-y-3 rounded-md border border-dashed p-4 text-sm">
        <p className="text-muted-foreground">
          {processing
            ? 'Vos documents sont encore en cours de traitement.'
            : 'Aucun document dans cette matière. Ajoutez un document pour générer votre fiche de révision.'}
        </p>
        {data.readyDocuments > 0 ? (
          <Button onClick={() => void generate()}>Générer ma fiche</Button>
        ) : (
          <Button
            onClick={() =>
              window.dispatchEvent(new Event('open-document-upload'))
            }
          >
            Ajouter un document
          </Button>
        )}
      </div>
    );
  }
  const sources = collectStudySheetSources(data.sheet.sections);
  const sourceNumberByDocument = new Map(
    sources.map((source, index) => [source.documentId, index + 1]),
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-1">
        <Button
          size="icon"
          variant="ghost"
          title="Agrandir le panneau"
          aria-label="Agrandir le panneau"
          onClick={onExpand}
        >
          <Maximize2 size={16} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          title="Imprimer ou exporter"
          aria-label="Imprimer ou exporter"
          onClick={() => window.print()}
        >
          <Printer size={16} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void generate(true)}>
          <RefreshCw size={14} /> Regénérer
        </Button>
      </div>
      {data.documentsChanged && (
        <p className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          Des documents ont changé depuis cette fiche. Vous pouvez la regénérer.
        </p>
      )}
      <div className="space-y-5">
        {data.sheet.sections.map((section) => (
          <section key={section.id}>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{section.title}</h3>
              {section.importance === 'high' && (
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  À SAVOIR
                </span>
              )}
              <Button
                className="ml-auto h-7 px-2 text-xs"
                disabled={isSaving}
                size="sm"
                variant="ghost"
                onClick={() =>
                  setEditingItem({
                    sectionId: section.id,
                    text: '',
                    importance: 'medium',
                  })
                }
              >
                Ajouter
              </Button>
            </div>
            {editingItem?.sectionId === section.id && !editingItem.itemId && (
              <ItemEditor
                item={editingItem}
                isSaving={isSaving}
                onCancel={() => setEditingItem(null)}
                onChange={setEditingItem}
                onSave={() => void saveItem()}
              />
            )}
            <ul className="mt-2 space-y-2">
              {section.items.map((item) => {
                const citation = item.citation;
                return (
                  <li key={item.id} className="rounded-md border p-3 text-sm">
                    {editingItem?.itemId === item.id ? (
                      <ItemEditor
                        item={editingItem}
                        isSaving={isSaving}
                        onCancel={() => setEditingItem(null)}
                        onChange={setEditingItem}
                        onSave={() => void saveItem()}
                      />
                    ) : (
                      <>
                        <p>{item.text}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {citation ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-1.5 text-xs"
                              onClick={() =>
                                window.dispatchEvent(
                                  new CustomEvent('open-source-viewer', {
                                    detail: {
                                      documentId: citation.documentId,
                                      name: citation.documentName,
                                      page: citation.page,
                                    },
                                  }),
                                )
                              }
                            >
                              <FileText size={12} /> [
                              {sourceNumberByDocument.get(citation.documentId)}]{' '}
                              {citation.documentName}
                              {citation.page ? ` · p. ${citation.page}` : ''}
                            </Button>
                          ) : (
                            <span className="px-1.5 text-xs text-muted-foreground">
                              Note personnelle
                            </span>
                          )}
                          <Button
                            aria-label="Modifier cet élément"
                            className="h-7 w-7 p-0"
                            disabled={isSaving}
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setEditingItem({
                                sectionId: section.id,
                                itemId: item.id,
                                text: item.text,
                                importance: item.importance,
                              })
                            }
                          >
                            <Pencil size={13} />
                          </Button>
                          <Button
                            aria-label="Supprimer cet élément"
                            className="h-7 w-7 p-0 text-destructive"
                            disabled={isSaving}
                            size="icon"
                            variant="ghost"
                            onClick={() => void deleteItem(section.id, item.id)}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <section className="border-t pt-4">
        <h3 className="font-medium">Sources</h3>
        <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
          {sources.map((source, index) => (
            <li key={source.documentId}>
              <Button
                size="sm"
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('open-source-viewer', {
                      detail: {
                        documentId: source.documentId,
                        name: source.documentName,
                        page: source.pages[0] ?? null,
                      },
                    }),
                  )
                }
              >
                [{index + 1}] {source.documentName}
                {source.pages.length > 0
                  ? ` · p. ${source.pages.join(', ')}`
                  : ''}
              </Button>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function ItemEditor({
  item,
  isSaving,
  onCancel,
  onChange,
  onSave,
}: {
  item: {
    sectionId: string;
    itemId?: string;
    text: string;
    importance: 'high' | 'medium';
  };
  isSaving: boolean;
  onCancel: () => void;
  onChange: (item: {
    sectionId: string;
    itemId?: string;
    text: string;
    importance: 'high' | 'medium';
  }) => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-2 space-y-2">
      <textarea
        aria-label="Contenu de l’élément de fiche"
        className="min-h-20 w-full rounded-md border bg-background p-2 text-sm"
        maxLength={520}
        value={item.text}
        onChange={(event) => onChange({ ...item, text: event.target.value })}
      />
      <div className="flex items-center justify-between gap-2">
        <Button
          className="h-8"
          size="sm"
          type="button"
          variant="outline"
          onClick={() =>
            onChange({
              ...item,
              importance: item.importance === 'high' ? 'medium' : 'high',
            })
          }
        >
          {item.importance === 'high' ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
          {item.importance === 'high' ? 'À savoir' : 'Secondaire'}
        </Button>
        <div className="flex gap-2">
          <Button size="sm" type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            disabled={isSaving || !item.text.trim()}
            size="sm"
            type="button"
            onClick={onSave}
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
