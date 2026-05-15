import type { ScoreMetadata } from '@/shared/types';

export interface SearchItem {
  filename: string;
  metadata: ScoreMetadata;
}

export interface FilterOptions {
  composers: string[];
  genres: string[];
  instruments: string[];
  labels: string[];
}

export interface ActiveFilters {
  composers: Set<string>;
  genres: Set<string>;
  instruments: Set<string>;
  labels: Set<string>;
}

export function createEmptyFilters(): ActiveFilters {
  return {
    composers: new Set(),
    genres: new Set(),
    instruments: new Set(),
    labels: new Set(),
  };
}

export function hasActiveFilters(filters: ActiveFilters): boolean {
  return (
    filters.composers.size > 0 ||
    filters.genres.size > 0 ||
    filters.instruments.size > 0 ||
    filters.labels.size > 0
  );
}

export function extractFilterOptions(scores: Record<string, ScoreMetadata>): FilterOptions {
  const composers = new Set<string>();
  const genres = new Set<string>();
  const instruments = new Set<string>();
  const labels = new Set<string>();

  for (const score of Object.values(scores)) {
    if (score.composer) composers.add(score.composer);
    if (score.genre) genres.add(score.genre);
    if (score.keywords) instruments.add(score.keywords);
    if (score.labels) {
      for (const raw of score.labels.split(',')) {
        const trimmed = raw.trim();
        if (trimmed) labels.add(trimmed);
      }
    }
  }

  return {
    composers: [...composers].sort((a, b) => a.localeCompare(b)),
    genres: [...genres].sort((a, b) => a.localeCompare(b)),
    instruments: [...instruments].sort((a, b) => a.localeCompare(b)),
    labels: [...labels].sort((a, b) => a.localeCompare(b)),
  };
}

function splitLabels(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Filter items by active facet selections (AND across facets, OR within a facet). */
export function filterScores(items: SearchItem[], filters: ActiveFilters): SearchItem[] {
  if (!hasActiveFilters(filters)) return items;

  return items.filter(({ metadata: m }) => {
    if (filters.composers.size > 0 && (!m.composer || !filters.composers.has(m.composer))) {
      return false;
    }
    if (filters.genres.size > 0 && (!m.genre || !filters.genres.has(m.genre))) {
      return false;
    }
    if (filters.instruments.size > 0 && (!m.keywords || !filters.instruments.has(m.keywords))) {
      return false;
    }
    if (filters.labels.size > 0) {
      const scoreLabels = splitLabels(m.labels);
      if (!scoreLabels.some((l) => filters.labels.has(l))) return false;
    }
    return true;
  });
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
