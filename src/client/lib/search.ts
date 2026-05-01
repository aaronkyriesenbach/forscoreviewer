import type { ScoreMetadata } from '@/shared/types';

export interface SearchItem {
  filename: string;
  metadata: ScoreMetadata;
}

export function createSearchIndex(scores: Record<string, ScoreMetadata>): SearchItem[] {
  return Object.entries(scores).map(([filename, metadata]) => ({ filename, metadata }));
}

export function searchScores(items: SearchItem[], query: string): SearchItem[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(({ metadata: m }) =>
    [m.title, m.composer, m.genre, m.keywords, m.labels].some(
      (f) => f?.toLowerCase().includes(q),
    ),
  );
}
