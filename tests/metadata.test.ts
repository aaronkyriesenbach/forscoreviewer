import { describe, expect, it } from 'vitest';
import { serializeBplist, PlistDate } from 'bplist-lossless';

import { transformPlistToMetadata } from '@/server/parser/metadata';

/**
 * Build a minimal binary plist that exercises every code path in
 * transformPlistToMetadata:
 *   - pipe-delimited score fields (title, composer, genre, added, bookmarks)
 *   - setlist entries (&SET; prefix)
 *   - system keys (&SYS; prefix → filtered out)
 *   - .plist keys → filtered out
 *   - Last Page 0 → mapped to undefined
 *   - Last Page >0 → kept
 *   - bigint values → converted to number
 *   - PlistDate → converted to ISO string
 *   - Uint8Array values → stripped
 *   - scores without explicit title → filename used as fallback
 */
function buildTestPlist(): Uint8Array {
  const plist: Record<string, unknown> = {
    // ── Score 1: full metadata ──────────────────────────────────────
    'Sonata K.545.pdf|title': 'Sonata K.545',
    'Sonata K.545.pdf|composer': 'Mozart',
    'Sonata K.545.pdf|genre': 'Classical',
    'Sonata K.545.pdf|keywords': 'piano',
    'Sonata K.545.pdf|labels': 'solo',
    'Sonata K.545.pdf|added': new PlistDate(new Date('2025-01-15T10:00:00Z')),
    'Sonata K.545.pdf|bookmarks': [
      { Title: 'Allegro', 'First Page': 1, 'Last Page': 5 },
      { Title: 'Andante', 'First Page': 6, 'Last Page': 0 },   // 0 → undefined
      { Title: 'Rondo', 'First Page': 10, 'Last Page': 14 },
    ],
    'Sonata K.545.pdf|bpm': BigInt(120),    // bigint → number
    'Sonata K.545.pdf|binary': new Uint8Array([0xDE, 0xAD]),  // stripped

    // ── Score 2: minimal metadata (no title → filename fallback) ───
    'Prelude BWV 846.pdf|composer': 'Bach',
    'Prelude BWV 846.pdf|genre': 'Baroque',

    // ── Score 3: another score with bookmarks ──────────────────────
    'Waltz Op.64.pdf|title': 'Minute Waltz',
    'Waltz Op.64.pdf|composer': 'Chopin',
    'Waltz Op.64.pdf|bookmarks': [
      { Title: 'A Section', 'First Page': 1, 'Last Page': 0 },
    ],

    // ── Setlists ────────────────────────────────────────────────────
    '&SET;Recital': [
      { Title: 'Sonata K.545', FilePath: 'Sonata K.545.pdf' },
      { Title: 'Minute Waltz', FilePath: 'Waltz Op.64.pdf' },
    ],
    '&SET;Practice': [
      { Title: 'Prelude', FilePath: 'Prelude BWV 846.pdf' },
    ],

    // ── Filtered keys ───────────────────────────────────────────────
    '&SYS;version': 3,
    '&SYS;device': 'iPad',
    'backup.plist': 'should be skipped',
  };

  return serializeBplist(plist);
}

describe('transformPlistToMetadata', () => {
  const plistData = buildTestPlist();

  it('parses the correct number of scores', () => {
    const result = transformPlistToMetadata(plistData);
    expect(Object.keys(result.scores)).toHaveLength(3);
  });

  it('extracts title and composer for a fully-specified score', () => {
    const result = transformPlistToMetadata(plistData);
    const sonata = result.scores['Sonata K.545.pdf'];
    expect(sonata.title).toBe('Sonata K.545');
    expect(sonata.composer).toBe('Mozart');
    expect(sonata.genre).toBe('Classical');
  });

  it('falls back to filename as title when title is absent', () => {
    const result = transformPlistToMetadata(plistData);
    const prelude = result.scores['Prelude BWV 846.pdf'];
    expect(prelude.title).toBe('Prelude BWV 846.pdf');
    expect(prelude.composer).toBe('Bach');
  });

  it('converts PlistDate to ISO 8601 string', () => {
    const result = transformPlistToMetadata(plistData);
    const added = result.scores['Sonata K.545.pdf'].added;
    expect(typeof added).toBe('string');
    expect(added).toBe('2025-01-15T10:00:00.000Z');
  });

  it('converts bigint values to number', () => {
    const result = transformPlistToMetadata(plistData);
    const bpm = result.scores['Sonata K.545.pdf'].bpm;
    expect(typeof bpm).toBe('number');
    expect(bpm).toBe(120);
  });

  it('strips Uint8Array values from score metadata', () => {
    const result = transformPlistToMetadata(plistData);
    const sonata = result.scores['Sonata K.545.pdf'];
    expect(sonata).not.toHaveProperty('binary');
  });

  it('maps bookmarks with Last Page 0 to undefined lastPage', () => {
    const result = transformPlistToMetadata(plistData);
    const bookmarks = result.scores['Sonata K.545.pdf'].bookmarks!;
    const andante = bookmarks.find((b) => b.title === 'Andante')!;
    expect(andante.firstPage).toBe(6);
    expect(andante.lastPage).toBeUndefined();
  });

  it('preserves Last Page > 0 as lastPage', () => {
    const result = transformPlistToMetadata(plistData);
    const bookmarks = result.scores['Sonata K.545.pdf'].bookmarks!;
    const allegro = bookmarks.find((b) => b.title === 'Allegro')!;
    expect(allegro.firstPage).toBe(1);
    expect(allegro.lastPage).toBe(5);
  });

  it('parses all bookmarks for a score', () => {
    const result = transformPlistToMetadata(plistData);
    expect(result.scores['Sonata K.545.pdf'].bookmarks).toHaveLength(3);
    expect(result.scores['Waltz Op.64.pdf'].bookmarks).toHaveLength(1);
  });

  it('parses setlists with correct names and entries', () => {
    const result = transformPlistToMetadata(plistData);
    expect(Object.keys(result.setlists)).toHaveLength(2);

    expect(result.setlists['Recital']).toHaveLength(2);
    expect(result.setlists['Recital'][0]).toEqual({
      title: 'Sonata K.545',
      file: 'Sonata K.545.pdf',
    });

    expect(result.setlists['Practice']).toHaveLength(1);
    expect(result.setlists['Practice'][0]).toEqual({
      title: 'Prelude',
      file: 'Prelude BWV 846.pdf',
    });
  });

  it('filters out &SYS; keys from scores', () => {
    const result = transformPlistToMetadata(plistData);
    for (const filename of Object.keys(result.scores)) {
      expect(filename.startsWith('&SYS;')).toBe(false);
    }
  });

  it('filters out .plist keys from scores', () => {
    const result = transformPlistToMetadata(plistData);
    for (const filename of Object.keys(result.scores)) {
      expect(filename.endsWith('.plist')).toBe(false);
    }
  });

  it('filters out pipe-delimited composite keys from score filenames', () => {
    const result = transformPlistToMetadata(plistData);
    for (const filename of Object.keys(result.scores)) {
      expect(filename.includes('|')).toBe(false);
    }
  });

  it('provides a title for every score', () => {
    const result = transformPlistToMetadata(plistData);
    for (const score of Object.values(result.scores)) {
      expect(typeof score.title).toBe('string');
      expect(score.title.length).toBeGreaterThan(0);
    }
  });

  it('exposes setlist entries with title and file string fields', () => {
    const result = transformPlistToMetadata(plistData);
    for (const entries of Object.values(result.setlists)) {
      for (const entry of entries) {
        expect(typeof entry.title).toBe('string');
        expect(typeof entry.file).toBe('string');
      }
    }
  });

  it('serializes to JSON without error (no unconvertible bigint values)', () => {
    const result = transformPlistToMetadata(plistData);
    const json = JSON.stringify(result);
    expect(typeof json).toBe('string');
  });

  it('contains no Uint8Array values anywhere in the result', () => {
    function containsUint8Array(value: unknown): boolean {
      if (value instanceof Uint8Array) return true;
      if (Array.isArray(value)) return value.some(containsUint8Array);
      if (typeof value === 'object' && value !== null) {
        return Object.values(value as Record<string, unknown>).some(containsUint8Array);
      }
      return false;
    }

    const result = transformPlistToMetadata(plistData);
    expect(containsUint8Array(result)).toBe(false);
  });
});
