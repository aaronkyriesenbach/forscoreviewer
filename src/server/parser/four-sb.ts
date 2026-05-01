import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { gunzipSync } from 'zlib';

export interface ExtractEntry {
  path: string;
  size: number;
}

export interface ExtractResult {
  entries: ExtractEntry[];
  plistData: Uint8Array;
}

const ARCHIVE_TAG = '<--4SBV03-->';
const TAG_LENGTH = 12;
const HEADER_LENGTH = 32;

function substitutePath(filename: string): string {
  return filename
    .replace('{%DOCUMENTS_DIR%}/', 'documents/')
    .replace('{%AUX_DIR%}/', 'aux/')
    .replace(/\|/g, '_');
}

export async function extract4sb(
  archiveBuffer: Buffer,
  outputDir: string,
): Promise<ExtractResult> {
  mkdirSync(outputDir, { recursive: true });

  const tag = archiveBuffer.subarray(0, TAG_LENGTH);
  const actualTag = tag.toString('ascii');

  if (actualTag !== ARCHIVE_TAG) {
    throw new Error(
      `Invalid 4SB archive: expected tag ${ARCHIVE_TAG}, got ${actualTag || '<empty>'}`,
    );
  }

  const entries: ExtractEntry[] = [];
  let plistData = new Uint8Array();
  let offset = TAG_LENGTH;
  let entryIndex = 0;

  while (true) {
    if (offset + HEADER_LENGTH > archiveBuffer.length) {
      break;
    }

    const header = archiveBuffer.subarray(offset, offset + HEADER_LENGTH);
    offset += HEADER_LENGTH;

    const filenameLen = parseInt(header.subarray(0, 16).toString('ascii').trim(), 10);
    const compressedSize = parseInt(header.subarray(16, 32).toString('ascii').trim(), 10);

    if (Number.isNaN(filenameLen) || Number.isNaN(compressedSize)) {
      break;
    }

    if (offset + filenameLen > archiveBuffer.length) {
      break;
    }

    const filename = archiveBuffer.subarray(offset, offset + filenameLen).toString('utf8');
    offset += filenameLen;

    if (offset + compressedSize > archiveBuffer.length) {
      break;
    }

    const compressedBytes = archiveBuffer.subarray(offset, offset + compressedSize);
    offset += compressedSize;

    try {
      const decompressed = gunzipSync(compressedBytes);

      if (entryIndex === 0) {
        plistData = new Uint8Array(decompressed);
      }

      const cleanPath = substitutePath(filename);

      if (cleanPath.endsWith('.4sb')) {
        entryIndex += 1;
        continue;
      }

      const outPath = join(outputDir, cleanPath);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, decompressed);

      entries.push({
        path: cleanPath,
        size: decompressed.length,
      });
    } catch (error: unknown) {
      console.warn(`Decompression error for ${filename}:`, error);
      entryIndex += 1;
      continue;
    }

    entryIndex += 1;
  }

  return {
    entries,
    plistData,
  };
}
