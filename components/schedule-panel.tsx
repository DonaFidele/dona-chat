'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { fetcher } from '@/lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';

type Slot = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  location: string | null;
};

const weekdays = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];

export function SchedulePanel({
  subjectId,
}: { subjectId: string | null | undefined }) {
  const [weekday, setWeekday] = useState('0');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const url = subjectId ? `/api/subjects/${subjectId}/schedule` : null;
  const { data, mutate } = useSWR<{ slots: Array<Slot> }>(url, fetcher);

  if (!subjectId) {
    return (
      <p className="text-sm text-muted-foreground">
        Choisissez une matière avant d’ajouter un créneau.
      </p>
    );
  }

  const addSlot = async () => {
    if (!url) return;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekday: Number(weekday),
        startTime,
        endTime,
        location,
      }),
    });
    if (!response.ok) {
      toast.error('Le créneau est invalide. Vérifiez les horaires.');
      return;
    }
    setLocation('');
    await mutate();
  };

  const removeSlot = async (slot: Slot) => {
    const response = await fetch(`${url}?id=${slot.id}`, { method: 'DELETE' });
    if (!response.ok) toast.error('Le créneau n’a pas pu être supprimé');
    else await mutate();
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-2">
        <h3 className="text-sm font-medium">Ajouter un créneau</h3>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={weekday}
          onChange={(event) => setWeekday(event.target.value)}
        >
          {weekdays.map((day, index) => (
            <option key={day} value={index}>
              {day}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
          <Input
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
          />
        </div>
        <Input
          value={location}
          maxLength={160}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Lieu ou lien (facultatif)"
        />
        <Button size="sm" onClick={() => void addSlot()}>
          Ajouter
        </Button>
      </section>
      <section>
        <h3 className="text-sm font-medium">Créneaux hebdomadaires</h3>
        <div className="mt-2 space-y-2">
          {data?.slots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border/80 p-3 text-sm"
            >
              <span>
                {weekdays[slot.weekday]} · {slot.startTime.slice(0, 5)}–
                {slot.endTime.slice(0, 5)}
                {slot.location ? ` · ${slot.location}` : ''}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-destructive"
                onClick={() => void removeSlot(slot)}
                aria-label="Supprimer le créneau"
              >
                <Trash2 size={15} />
              </Button>
            </div>
          ))}
          {data?.slots.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun créneau planifié.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
