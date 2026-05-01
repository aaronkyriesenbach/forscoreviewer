import { describe, expect, it } from 'vitest';

import { createSearchIndex, searchScores } from '@/client/lib/search';
import type { ScoreMetadata } from '@/shared/types';

function makeScore(overrides: Partial<ScoreMetadata> = {}): ScoreMetadata {
  return { title: '', ...overrides };
}

const scores: Record<string, ScoreMetadata> = {
  'sonata.pdf': makeScore({
    title: 'Sonata K.545',
    composer: 'Mozart',
    genre: 'Classical',
    keywords: 'piano',
    labels: 'solo',
  }),
  'prelude.pdf': makeScore({
    title: 'Prelude BWV 846',
    composer: 'Bach',
    genre: 'Baroque',
    keywords: 'harpsichord',
    labels: 'solo,keyboard',
  }),
  'concerto.pdf': makeScore({
    title: 'Violin Concerto',
    composer: 'Mendelssohn',
    genre: 'Romantic',
    keywords: 'violin',
    labels: 'solo_with_accompaniment',
  }),
};

describe('createSearchIndex', () => {
  it('returns one entry per score keyed by filename', () => {
    const items = createSearchIndex(scores);
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.filename).sort()).toEqual(
      ['concerto.pdf', 'prelude.pdf', 'sonata.pdf'],
    );
  });
});

describe('searchScores', () => {
  const items = createSearchIndex(scores);

  it('returns all items for empty query', () => {
    expect(searchScores(items, '')).toHaveLength(3);
  });

  it('returns all items for whitespace-only query', () => {
    expect(searchScores(items, '   ')).toHaveLength(3);
  });

  it('matches on title (case-insensitive)', () => {
    const results = searchScores(items, 'sonata');
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('sonata.pdf');
  });

  it('matches on composer', () => {
    const results = searchScores(items, 'bach');
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('prelude.pdf');
  });

  it('matches on genre', () => {
    const results = searchScores(items, 'romantic');
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('concerto.pdf');
  });

  it('matches on keywords', () => {
    const results = searchScores(items, 'violin');
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('concerto.pdf');
  });

  it('matches on labels', () => {
    const results = searchScores(items, 'keyboard');
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('prelude.pdf');
  });

  it('returns empty array when no match', () => {
    expect(searchScores(items, 'xyznonexistent')).toHaveLength(0);
  });

  it('handles scores with missing optional fields', () => {
    const sparse = createSearchIndex({
      'minimal.pdf': makeScore({ title: 'Minimal Piece' }),
    });
    const results = searchScores(sparse, 'minimal');
    expect(results).toHaveLength(1);
    expect(searchScores(sparse, 'some-composer')).toHaveLength(0);
  });
});
