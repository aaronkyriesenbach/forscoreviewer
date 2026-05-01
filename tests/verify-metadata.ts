import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseBplist, PlistDate } from 'bplist-lossless';

import { transformPlistToMetadata } from '@/server/parser/metadata';
import type { Bookmark, LibraryMetadata } from '@/shared/types';

type PlistRecord = Record<string, unknown>;

const samplePath = resolve(
  process.cwd(),
  'extracted_sample',
  'Archive 2026-04-30 15-26-06.4sb',
);
const evidenceDir = resolve(process.cwd(), '.sisyphus', 'evidence');

function isPlistRecord(value: unknown): value is PlistRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function containsDisallowedValue(value: unknown): boolean {
  if (value instanceof Date || value instanceof PlistDate) {
    return true;
  }

  if (typeof value === 'bigint') {
    return true;
  }

  if (value instanceof Uint8Array) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsDisallowedValue(item));
  }

  if (isPlistRecord(value)) {
    return Object.values(value).some((item) => containsDisallowedValue(item));
  }

  return false;
}

function formatBookmarks(bookmarks: Bookmark[] | undefined): string {
  return JSON.stringify(bookmarks ?? [], null, 2);
}

function getParsedPlist(plistData: Uint8Array): PlistRecord {
  const parsed = parseBplist(plistData) as unknown;

  if (!isPlistRecord(parsed)) {
    throw new Error('Expected parsed plist root object.');
  }

  return parsed;
}

function findBookmarkZeroLastPageCase(
  plist: PlistRecord,
  metadata: LibraryMetadata,
): { filename: string; bookmarkTitle: string; transformed: Bookmark | undefined } {
  for (const [key, value] of Object.entries(plist)) {
    if (!key.endsWith('|bookmarks') || !Array.isArray(value)) {
      continue;
    }

    const lastPipeIndex = key.lastIndexOf('|');
    const filename = key.slice(0, lastPipeIndex);

    if (filename.length === 0 || filename.includes('|')) {
      continue;
    }

    for (const rawBookmark of value) {
      if (!isPlistRecord(rawBookmark)) {
        continue;
      }

      const title = rawBookmark.Title;
      const lastPage = rawBookmark['Last Page'];

      if (typeof title !== 'string') {
        continue;
      }

      if (lastPage === 0 || lastPage === 0n) {
        const transformed = metadata.scores[filename]?.bookmarks?.find(
          (bookmark) => bookmark.title === title,
        );

        return { filename, bookmarkTitle: title, transformed };
      }
    }
  }

  throw new Error('Could not find a bookmark with raw Last Page = 0.');
}

function main(): void {
  mkdirSync(evidenceDir, { recursive: true });

  const plistData = readFileSync(samplePath);
  const metadata = transformPlistToMetadata(plistData);
  const parsedPlist = getParsedPlist(plistData);

  const scoreCount = Object.keys(metadata.scores).length;
  const porchfest = metadata.setlists.Porchfest;
  const beethoven = metadata.scores['11 Bagatelles, Op.119.pdf'];
  const inventions = metadata.scores['15 Inventions, BWV 772-786.pdf'];

  assert(scoreCount > 0, 'Expected at least one score in transformed metadata.');
  assert(Array.isArray(porchfest), 'Expected Porchfest setlist to exist.');
  assert(
    beethoven?.composer === 'Ludwig van Beethoven',
    'Expected Beethoven composer metadata to match sample data.',
  );
  assert(typeof beethoven?.added === 'string', 'Expected added field to be an ISO string.');
  assert(Array.isArray(inventions?.bookmarks), 'Expected inventions bookmarks to exist.');
  assert(
    inventions?.bookmarks?.every(
      (bookmark) => typeof bookmark.title === 'string' && typeof bookmark.firstPage === 'number',
    ) ?? false,
    'Expected inventions bookmarks to contain typed bookmark objects.',
  );
  assert(!containsDisallowedValue(metadata), 'Found Date, bigint, or Uint8Array in transformed data.');

  writeFileSync(
    resolve(evidenceDir, 'task-4-real-plist-transform.txt'),
    [
      'Scenario 1: Transform real plist to metadata',
      `Score count: ${scoreCount}`,
      `Score count matches expected 72: ${scoreCount === 72}`,
      `Setlists: ${Object.keys(metadata.setlists).join(', ')}`,
      `Porchfest items: ${porchfest.length}`,
      `11 Bagatelles composer: ${beethoven?.composer ?? 'missing'}`,
      `11 Bagatelles added type: ${typeof beethoven?.added}`,
      '15 Inventions bookmarks:',
      formatBookmarks(inventions?.bookmarks),
      'Disallowed values present: false',
    ].join('\n'),
  );

  const zeroLastPageCase = findBookmarkZeroLastPageCase(parsedPlist, metadata);

  assert(
    zeroLastPageCase.transformed?.lastPage === undefined,
    'Expected transformed bookmark lastPage to be undefined when raw Last Page is 0.',
  );

  writeFileSync(
    resolve(evidenceDir, 'task-4-bookmark-last-page.txt'),
    [
      'Scenario 2: Bookmark Last Page 0 handling',
      `Score: ${zeroLastPageCase.filename}`,
      `Bookmark: ${zeroLastPageCase.bookmarkTitle}`,
      `Transformed bookmark: ${JSON.stringify(zeroLastPageCase.transformed, null, 2)}`,
      'Assertion: raw Last Page 0 -> transformed lastPage undefined',
    ].join('\n'),
  );

  const scoreKeys = Object.keys(metadata.scores);
  const sysKeys = scoreKeys.filter((key) => key.startsWith('&SYS;'));
  const plistKeys = scoreKeys.filter((key) => key.endsWith('.plist'));

  assert(sysKeys.length === 0, 'Found &SYS; keys in output scores.');
  assert(plistKeys.length === 0, 'Found .plist filenames in output scores.');

  writeFileSync(
    resolve(evidenceDir, 'task-4-key-filtering.txt'),
    [
      'Scenario 3: Key filtering',
      `Total score keys: ${scoreKeys.length}`,
      `System keys present: ${sysKeys.length}`,
      `Plist filenames present: ${plistKeys.length}`,
      `Residual pipe-delimited keys present: ${scoreKeys.filter((key) => key.includes('|')).length}`,
      'Assertion: no &SYS; or .plist keys leaked into scores output',
    ].join('\n'),
  );
}

main();
