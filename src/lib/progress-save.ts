import { normalizeLevels } from './progression';
import { fromLegacyLevel } from './proficiency';

export type HistoryEntry = { name: string; from: number; to: number; at: string; sample?: boolean };

export function readProgress(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Invalid backup');
  const data = value as Record<string, unknown>;
  if ((data.version !== 1 && data.version !== 2) || (data.version === 2 && data.ratingScale !== 5) || !data.levels || typeof data.levels !== 'object' || Array.isArray(data.levels)) throw new Error('Invalid backup');
  const legacy = data.version === 1;
  const convert = (n: number) => legacy ? fromLegacyLevel(n) : Math.max(0, Math.min(5, Math.round(n)));
  const entries = Object.entries(data.levels).map(([id, n]) => [id, typeof n === 'number' && Number.isFinite(n) ? convert(n) : 0]);
  const history: HistoryEntry[] = [];
  if (Array.isArray(data.history)) for (const entry of data.history) {
    if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string' || typeof entry.at !== 'string' || !Number.isFinite(Date.parse(entry.at)) || !Number.isFinite(entry.from) || !Number.isFinite(entry.to)) continue;
    // A record with no change is noise (for example, two old levels sharing one star band).
    if (convert(entry.from) === convert(entry.to)) continue;
    history.push({ name: entry.name, from: convert(entry.from), to: convert(entry.to), at: entry.at, ...(entry.sample === true && { sample: true }) });
    if (history.length === 100) break;
  }
  return { levels: normalizeLevels(Object.fromEntries(entries)), history, sample: data.sample === true, goalId: data.goalId, theme: data.theme, sound: data.sound === true };
}
