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
};

export function CreateSubjectModal({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (subject: NewSubject) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setColor('');
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        color,
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
            <AlertDialogTitle>Créer une matière</AlertDialogTitle>
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
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Mathématiques"
              required
            />
          </div>

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
              {isCreating ? 'Création…' : 'Créer la matière'}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
