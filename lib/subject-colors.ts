export type SubjectTheme = {
  accent: string;
  color: string;
  icon: 'book' | 'calculator' | 'flask' | 'landmark' | 'scale';
};

const subjectColorMap: Record<string, SubjectTheme> = {
  droit: { color: '#7FA8B5', accent: '#12242A', icon: 'scale' },
  mathématiques: { color: '#E8C468', accent: '#2E2306', icon: 'calculator' },
  mathematiques: { color: '#E8C468', accent: '#2E2306', icon: 'calculator' },
  histoire: { color: '#D98C82', accent: '#3A150F', icon: 'landmark' },
  'physique/chimie': { color: '#3730A3', accent: '#8B5CF6', icon: 'flask' },
  physique: { color: '#9DBF8E', accent: '#1B2C15', icon: 'flask' },
  chimie: { color: '#9DBF8E', accent: '#1B2C15', icon: 'flask' },
  littérature: { color: '#6B2E6F', accent: '#F472B6', icon: 'book' },
  litterature: { color: '#6B2E6F', accent: '#F472B6', icon: 'book' },
};

const defaultTheme: SubjectTheme = {
  color: '#A9B3AC',
  accent: '#25291F',
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
