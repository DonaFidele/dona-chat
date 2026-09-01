export type SubjectTheme = {
  accent: string;
  color: string;
  icon: 'book' | 'calculator' | 'flask' | 'landmark' | 'scale';
};

const subjectColorMap: Record<string, SubjectTheme> = {
  droit: { color: '#1E3A8A', accent: '#FBBF24', icon: 'scale' },
  mathématiques: { color: '#065F46', accent: '#06B6D4', icon: 'calculator' },
  mathematiques: { color: '#065F46', accent: '#06B6D4', icon: 'calculator' },
  histoire: { color: '#7C2D2D', accent: '#F4A261', icon: 'landmark' },
  'physique/chimie': { color: '#3730A3', accent: '#8B5CF6', icon: 'flask' },
  physique: { color: '#3730A3', accent: '#8B5CF6', icon: 'flask' },
  chimie: { color: '#3730A3', accent: '#8B5CF6', icon: 'flask' },
  littérature: { color: '#6B2E6F', accent: '#F472B6', icon: 'book' },
  litterature: { color: '#6B2E6F', accent: '#F472B6', icon: 'book' },
};

const defaultTheme: SubjectTheme = {
  color: '#334155',
  accent: '#38BDF8',
  icon: 'book',
};

export function getSubjectTheme(
  name: string,
  selectedColor?: string | null,
): SubjectTheme {
  const normalizedName = name.trim().toLocaleLowerCase('fr-FR');
  const mappedTheme = subjectColorMap[normalizedName] ?? defaultTheme;

  return {
    ...mappedTheme,
    color: selectedColor || mappedTheme.color,
  };
}

export const subjectColorChoices = [
  '#1E3A8A',
  '#065F46',
  '#7C2D2D',
  '#3730A3',
  '#6B2E6F',
  '#334155',
];
