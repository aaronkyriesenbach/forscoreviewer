import { parseBplist, PlistDate } from 'bplist-lossless';

import type {
  Bookmark,
  LibraryMetadata,
  ScoreMetadata,
  SetlistEntry,
} from '@/shared/types';

type PlistRecord = Record<string, unknown>;
type MutableScoreMetadata = Partial<ScoreMetadata> & Record<string, unknown>;

const SETLIST_PREFIX = '&SET;';
const SYSTEM_PREFIX = '&SYS;';

function isPlistRecord(value: unknown): value is PlistRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function convertValue(value: unknown): unknown {
  if (value instanceof PlistDate) {
    return value.toJSON();
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (value instanceof Uint8Array) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is unknown => item !== undefined).map(convertValue).filter(
      (item): item is unknown => item !== undefined,
    );
  }

  if (isPlistRecord(value)) {
    const result: PlistRecord = {};

    for (const [key, entryValue] of Object.entries(value)) {
      const converted = convertValue(entryValue);

      if (converted !== undefined) {
        result[key] = converted;
      }
    }

    return result;
  }

  return value;
}

function mapSetlistEntries(value: unknown): SetlistEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isPlistRecord(item)) {
      return [];
    }

    const title = item.Title;
    const file = item.FilePath;

    if (typeof title !== 'string' || typeof file !== 'string') {
      return [];
    }

    return [{ title, file }];
  });
}

function mapBookmark(value: unknown): Bookmark | undefined {
  if (!isPlistRecord(value)) {
    return undefined;
  }

  const title = value.Title;
  const firstPage = convertValue(value['First Page']);
  const lastPageValue = convertValue(value['Last Page']);

  if (typeof title !== 'string' || !isFiniteNumber(firstPage)) {
    return undefined;
  }

  const lastPage = isFiniteNumber(lastPageValue) && lastPageValue > 0 ? lastPageValue : undefined;

  return {
    title,
    firstPage,
    lastPage,
  };
}

function mapBookmarks(value: unknown): Bookmark[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const bookmark = mapBookmark(item);
    return bookmark === undefined ? [] : [bookmark];
  });
}

function getPlistRoot(plistData: Uint8Array): PlistRecord {
  const plist = parseBplist(plistData) as unknown;

  if (!isPlistRecord(plist)) {
    throw new TypeError('Expected metadata plist root to be an object.');
  }

  return plist;
}

export function transformPlistToMetadata(plistData: Uint8Array): LibraryMetadata {
  const plist = getPlistRoot(plistData);
  const scores: Record<string, MutableScoreMetadata> = {};
  const setlists: Record<string, SetlistEntry[]> = {};

  for (const [key, value] of Object.entries(plist)) {
    if (key.startsWith(SYSTEM_PREFIX) || key.endsWith('.plist')) {
      continue;
    }

    if (key.startsWith(SETLIST_PREFIX)) {
      const setlistName = key.slice(SETLIST_PREFIX.length);
      setlists[setlistName] = mapSetlistEntries(value);
      continue;
    }

    const lastPipeIndex = key.lastIndexOf('|');

    if (lastPipeIndex === -1) {
      continue;
    }

    const filename = key.slice(0, lastPipeIndex);
    const field = key.slice(lastPipeIndex + 1);

    if (filename.length === 0 || field.length === 0 || filename.includes('|')) {
      continue;
    }

    const score = scores[filename] ?? (scores[filename] = {});

    if (field === 'bookmarks') {
      score.bookmarks = mapBookmarks(value);
      continue;
    }

    const converted = convertValue(value);

    if (converted !== undefined) {
      score[field] = converted;
    }
  }

  const finalizedScores: Record<string, ScoreMetadata> = {};

  for (const [filename, score] of Object.entries(scores)) {
    finalizedScores[filename] = {
      ...score,
      title: typeof score.title === 'string' ? score.title : filename,
    };
  }

  return { scores: finalizedScores, setlists };
}
