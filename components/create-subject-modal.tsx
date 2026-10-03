'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { subjectColorChoices } from '@/lib/subject-colors';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

export type NewSubject = {
  name: string;
  description?: string;
  color?: string;
  teacher?: string;
  examDate?: string;
  explanationLevel?: 'normal' | 'simple' | 'eli12';
  language?: 'fr' | 'en';
};

export function CreateSubjectModal({
  open,
  onOpenChange,
  onCreate,
  subject,
  title = 'Créer une matière',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (subject: NewSubject) => Promise<void>;
  subject?: NewSubject | null;
  title?: string;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [teacher, setTeacher] = useState('');
  const [examDate, setExamDate] = useState('');
  const [explanationLevel, setExplanationLevel] = useState<
    'normal' | 'simple' | 'eli12'
  >('normal');
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setName(subject?.name ?? '');
      setDescription(subject?.description ?? '');
      setColor(subject?.color ?? '');
      setTeacher(subject?.teacher ?? '');
      setExamDate(subject?.examDate ?? '');
      setExplanationLevel(subject?.explanationLevel ?? 'normal');
      setLanguage(subject?.language ?? 'fr');
    } else {
      setName('');
      setDescription('');
      setColor('');
      setTeacher('');
      setExamDate('');
      setExplanationLevel('normal');
      setLanguage('fr');
    }
  }, [open, subject]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        color: color || undefined,
        teacher: teacher.trim() || undefined,
        examDate: examDate || undefined,
        explanationLevel,
        language,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>
              Ajoutez un cours, puis importez les documents qui serviront aux
              réponses du chat.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="subject-name">Nom de la matière</Label>
            <Input
              id="subject-name"
              autoFocus
              minLength={3}
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Mathématiques"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="subject-teacher">Enseignant·e (facultatif)</Label>
            <Input
              id="subject-teacher"
              maxLength={120}
              value={teacher}
              onChange={(event) => setTeacher(event.target.value)}
              placeholder="Ex. Mme Martin"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="subject-exam-date">Date d’examen</Label>
              <Input
                id="subject-exam-date"
                type="date"
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject-language">Langue des explications</Label>
              <select
                id="subject-language"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value as 'fr' | 'en')
                }
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">
              Niveau d’explication
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['normal', 'Normal'],
                ['simple', 'Simple'],
                ['eli12', 'Comme à 12 ans'],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={explanationLevel === value ? 'default' : 'outline'}
                  className="h-auto min-h-10 px-2 text-xs"
                  onClick={() =>
                    setExplanationLevel(value as 'normal' | 'simple' | 'eli12')
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-2">
            <Label htmlFor="subject-description">Description courte</Label>
            <Textarea
              id="subject-description"
              maxLength={180}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex. Algèbre linéaire et calcul matriciel"
            />
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Couleur</legend>
            <div className="flex flex-wrap gap-2">
              {subjectColorChoices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-label={`Choisir la couleur ${choice}`}
                  aria-pressed={color === choice}
                  className="size-8 rounded-full ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{
                    backgroundColor: choice,
                    boxShadow:
                      color === choice ? `0 0 0 2px ${choice}` : undefined,
                  }}
                  onClick={() => setColor(choice)}
                />
              ))}
            </div>
          </fieldset>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreating}>Annuler</AlertDialogCancel>
            <Button type="submit" disabled={isCreating}>
              {isCreating
                ? 'Enregistrement…'
                : subject
                  ? 'Enregistrer'
                  : 'Créer la matière'}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
