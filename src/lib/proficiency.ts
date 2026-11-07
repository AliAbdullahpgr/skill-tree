export const proficiencyLabels = ['Not rated', 'Learning the basics', 'Simple tasks', 'Work independently', 'Complex work', 'Teach and guide'] as const;
export const proficiencyDescriptions = [
  'No practical experience yet.',
  'I am learning the basics.',
  'I can complete simple tasks.',
  'I can work independently.',
  'I can handle complex work.',
  'I can teach and guide others.',
] as const;
export const ratingLabel = (value: number) => proficiencyLabels[Math.max(0, Math.min(5, Math.round(value)))];
export const plural = (count: number, word: string, many = `${word}s`) => `${count} ${count === 1 ? word : many}`;
export const starCount = (value: number) => plural(value, 'star');
// Apply the same bands to progress and requirements, retaining existing unlocks.
export const fromLegacyLevel = (value: number) => Number.isFinite(value) ? Math.ceil(Math.round(Math.max(0, Math.min(10, value))) / 2) : 0;
