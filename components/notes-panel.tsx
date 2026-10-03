'use client';

import { Check, Pencil, Star, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { fetcher } from '@/lib/utils';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

type Note = {
  id: string;
  content: string;
  starred: boolean;
  createdAt: string;
};

type SavedQuestion = {
  id: string;
  question: string;
  resolved: boolean;
};

type NotesResponse = { notes: Array<Note> };
type QuestionsResponse = { questions: Array<SavedQuestion> };

export function NotesPanel({
  subjectId,
  onAsk,
}: {
  subjectId: string | null | undefined;
  onAsk: (question: string) => void;
}) {
  const [content, setContent] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const notesUrl = subjectId ? `/api/subjects/${subjectId}/notes` : null;
  const questionsUrl = subjectId
    ? `/api/subjects/${subjectId}/saved-questions`
    : null;
  const { data: notesData, mutate: mutateNotes } = useSWR<NotesResponse>(
    notesUrl,
    fetcher,
  );
  const { data: questionsData, mutate: mutateQuestions } =
    useSWR<QuestionsResponse>(questionsUrl, fetcher);

  if (!subjectId) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        Choisissez une matière avant d’ajouter des notes.
      </p>
    );
  }

  const createNote = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || !notesUrl) return;
    const response = await fetch(notesUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: trimmedContent }),
    });
    if (!response.ok) {
      toast.error('La note n’a pas pu être ajoutée');
      return;
    }
    setContent('');
    await mutateNotes();
  };

  const updateNote = async (note: Note, values: Partial<Note>) => {
    if (!notesUrl) return;
    const response = await fetch(notesUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: note.id,
        content: values.content ?? note.content,
        starred: values.starred ?? note.starred,
      }),
    });
    if (!response.ok) toast.error('La note n’a pas pu être modifiée');
    else await mutateNotes();
  };

  const removeNote = async (note: Note) => {
    const response = await fetch(`${notesUrl}?id=${note.id}`, {
      method: 'DELETE',
    });
    if (!response.ok) toast.error('La note n’a pas pu être supprimée');
    else await mutateNotes();
  };

  const saveEditedNote = async () => {
    if (!editingNote) return;
    const nextContent = editingContent.trim();
    if (!nextContent) {
      toast.error('Une note ne peut pas être vide.');
      return;
    }
    await updateNote(editingNote, { content: nextContent });
    setEditingNote(null);
    setEditingContent('');
  };

  const toggleQuestion = async (question: SavedQuestion) => {
    if (!questionsUrl) return;
    const response = await fetch(questionsUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: question.id, resolved: !question.resolved }),
    });
    if (!response.ok) toast.error('La question n’a pas pu être mise à jour');
    else await mutateQuestions();
  };

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-medium">Nouvelle note</h3>
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="mt-2 min-h-20"
          placeholder="Notez une idée importante du cours…"
        />
        <Button className="mt-2" size="sm" onClick={() => void createNote()}>
          Ajouter la note
        </Button>
      </section>

      <section>
        <h3 className="text-sm font-medium">Mes notes</h3>
        <div className="mt-2 space-y-2">
          {notesData?.notes.map((note) => (
            <article
              key={note.id}
              className="rounded-md border border-border/80 p-3 text-sm"
            >
              {editingNote?.id === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                    maxLength={10_000}
                    className="min-h-24"
                    aria-label="Modifier la note"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void saveEditedNote()}>
                      Enregistrer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingNote(null);
                        setEditingContent('');
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap leading-5">{note.content}</p>
              )}
              <div className="mt-2 flex justify-end gap-1">
                {editingNote?.id === note.id ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => {
                      setEditingNote(null);
                      setEditingContent('');
                    }}
                    aria-label="Annuler la modification"
                  >
                    <X size={15} />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => {
                      setEditingNote(note);
                      setEditingContent(note.content);
                    }}
                    aria-label="Modifier la note"
                  >
                    <Pencil size={15} />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() =>
                    void updateNote(note, { starred: !note.starred })
                  }
                  aria-label={
                    note.starred ? 'Retirer des favoris' : 'Mettre en favori'
                  }
                >
                  <Star
                    className={
                      note.starred ? 'fill-amber-400 text-amber-400' : ''
                    }
                    size={15}
                  />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-destructive"
                  onClick={() => void removeNote(note)}
                  aria-label="Supprimer la note"
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </article>
          ))}
          {notesData?.notes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune note pour le moment.
            </p>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium">À revoir plus tard</h3>
        <div className="mt-2 space-y-2">
          {questionsData?.questions.map((question) => (
            <div
              key={question.id}
              className="rounded-md border border-border/80 p-3 text-sm"
            >
              <p
                className={
                  question.resolved ? 'text-muted-foreground line-through' : ''
                }
              >
                {question.question}
              </p>
              <div className="mt-2 flex gap-2">
                {!question.resolved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAsk(question.question)}
                  >
                    Poser maintenant
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => void toggleQuestion(question)}
                  aria-label={
                    question.resolved ? 'Marquer à revoir' : 'Marquer terminée'
                  }
                >
                  <Check size={15} />
                </Button>
              </div>
            </div>
          ))}
          {questionsData?.questions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Utilisez le marque-page près du champ de saisie pour garder une
              question à revoir.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
