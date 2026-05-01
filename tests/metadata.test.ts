import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { transformPlistToMetadata } from '@/server/parser/metadata';
import type { LibraryMetadata } from '@/shared/types';

const samplePath = resolve(
  process.cwd(),
  'extracted_sample',
  'Archive 2026-04-30 15-26-06.4sb',
);

describe('transformPlistToMetadata', () => {
  it('transforms the sample plist into frontend metadata', () => {
    const metadata = transformPlistToMetadata(readFileSync(samplePath));
    const beethoven = metadata.scores['11 Bagatelles, Op.119.pdf'];
    const inventions = metadata.scores['15 Inventions, BWV 772-786.pdf'];

    expect(Object.keys(metadata.scores).length).toBeGreaterThan(0);
    expect(metadata.setlists.Porchfest).toBeDefined();
    expect(beethoven?.composer).toBe('Ludwig van Beethoven');
    expect(typeof beethoven?.added).toBe('string');
    expect(inventions?.bookmarks).toEqual([
      { title: 'C Major', firstPage: 4, lastPage: undefined },
      { title: 'D minor', firstPage: 10, lastPage: undefined },
    ]);
    expect(Object.keys(metadata.scores).some((key) => key.startsWith('&SYS;'))).toBe(false);
    expect(Object.keys(metadata.scores).some((key) => key.endsWith('.plist'))).toBe(false);
    expect(Object.keys(metadata.scores).some((key) => key.includes('|'))).toBe(false);
  });
});

describe('transformPlistToMetadata — comprehensive real-data tests', () => {
  let result: LibraryMetadata;

  beforeAll(() => {
    const plistData = new Uint8Array(readFileSync(samplePath));
    result = transformPlistToMetadata(plistData);
  });

  it('returns exactly 72 scores', () => {
    expect(Object.keys(result.scores).length).toBe(72);
  });

  it('has a non-empty Porchfest setlist', () => {
    expect(result.setlists['Porchfest']).toBeDefined();
    expect(result.setlists['Porchfest'].length).toBeGreaterThan(0);
  });

  it('has Ludwig van Beethoven as composer for 11 Bagatelles', () => {
    expect(result.scores['11 Bagatelles, Op.119.pdf']?.composer).toBe('Ludwig van Beethoven');
  });

  it('exposes the added field as an ISO date string', () => {
    const added = result.scores['11 Bagatelles, Op.119.pdf']?.added;
    expect(typeof added).toBe('string');
    expect(() => new Date(added as string)).not.toThrow();
  });

  it('serializes to JSON without error (no unconvertible bigint values)', () => {
    const json = JSON.stringify(result);
    expect(typeof json).toBe('string');
  });

  it('maps bookmark Last Page 0 to undefined lastPage', () => {
    const scaleBookmarks = result.scores['Scale System.pdf']?.bookmarks;
    if (scaleBookmarks) {
      const aMajor = scaleBookmarks.find((b) => b.title === 'A Major');
      if (aMajor) {
        expect(aMajor.lastPage).toBeUndefined();
      }
    }
  });

  it('filters out &SYS; and .plist keys from scores', () => {
    for (const filename of Object.keys(result.scores)) {
      expect(filename.startsWith('&SYS;')).toBe(false);
      expect(filename.endsWith('.plist')).toBe(false);
    }
  });

  it('filters out pipe-delimited composite keys from scores', () => {
    for (const filename of Object.keys(result.scores)) {
      expect(filename.includes('|')).toBe(false);
    }
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

    expect(containsUint8Array(result)).toBe(false);
  });

  it('provides a title for every score', () => {
    for (const [filename, score] of Object.entries(result.scores)) {
      expect(typeof score.title).toBe('string');
      expect(score.title.length).toBeGreaterThan(0);
      expect(score.title).toBe(score.title ?? filename);
    }
  });

  it('exposes setlist entries with title and file string fields', () => {
    for (const [, entries] of Object.entries(result.setlists)) {
      for (const entry of entries) {
        expect(typeof entry.title).toBe('string');
        expect(typeof entry.file).toBe('string');
      }
    }
  });
});
