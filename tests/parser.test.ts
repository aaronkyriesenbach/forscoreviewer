import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { gzipSync } from 'node:zlib';

import { extract4sb } from '@/server/parser/four-sb';

const ARCHIVE_TAG = Buffer.from('<--4SBV03-->');

function buildSynthetic4sb(entries: Array<{ filename: string; data: Buffer }>): Buffer {
  const parts: Buffer[] = [ARCHIVE_TAG];
  for (const entry of entries) {
    const fnBytes = Buffer.from(entry.filename, 'utf8');
    const compressed = gzipSync(entry.data);
    const header = Buffer.alloc(32, ' ');
    header.write(fnBytes.length.toString().padStart(16), 0, 'ascii');
    header.write(compressed.length.toString().padStart(16), 16, 'ascii');
    parts.push(header, fnBytes, compressed);
  }
  return Buffer.concat(parts);
}

function buildRawEntryBytes(filename: string, rawPayload: Buffer): Buffer {
  const fnBytes = Buffer.from(filename, 'utf8');
  const header = Buffer.alloc(32, ' ');
  header.write(fnBytes.length.toString().padStart(16), 0, 'ascii');
  header.write(rawPayload.length.toString().padStart(16), 16, 'ascii');
  return Buffer.concat([header, fnBytes, rawPayload]);
}

describe('extract4sb', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(os.tmpdir(), 'four-sb-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('invalid input', () => {
    it('throws when archive tag is missing', async () => {
      const buf = Buffer.from('not-a-4sb-file');
      await expect(extract4sb(buf, tmpDir)).rejects.toThrow(/4SB|tag|Invalid/i);
    });

    it('throws on empty buffer', async () => {
      await expect(extract4sb(Buffer.alloc(0), tmpDir)).rejects.toThrow();
    });

    it('throws when buffer starts with wrong tag bytes', async () => {
      const buf = Buffer.from('<--WRONG01-->');
      await expect(extract4sb(buf, tmpDir)).rejects.toThrow(/4SB|tag|Invalid/i);
    });
  });

  describe('basic extraction', () => {
    it('extracts a single entry to disk with correct path and size', async () => {
      const content = Buffer.from('hello world');
      const archive = buildSynthetic4sb([{ filename: 'test.txt', data: content }]);

      const result = await extract4sb(archive, tmpDir);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].path).toBe('test.txt');
      expect(result.entries[0].size).toBe(content.length);

      const writtenContent = readFileSync(join(tmpDir, 'test.txt'));
      expect(writtenContent).toEqual(content);
    });

    it('returns plistData from entry 0 as the decompressed bytes', async () => {
      const plistContent = Buffer.from('fake plist payload for round-trip test');
      const archive = buildSynthetic4sb([{ filename: 'metadata.plist', data: plistContent }]);

      const result = await extract4sb(archive, tmpDir);

      expect(result.plistData).toBeInstanceOf(Uint8Array);
      expect(Buffer.from(result.plistData)).toEqual(plistContent);
    });

    it('extracts multiple entries and returns them all', async () => {
      const archive = buildSynthetic4sb([
        { filename: 'first.txt', data: Buffer.from('first content') },
        { filename: 'second.txt', data: Buffer.from('second content') },
        { filename: 'third.txt', data: Buffer.from('third content') },
      ]);

      const result = await extract4sb(archive, tmpDir);

      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].path).toBe('first.txt');
      expect(result.entries[1].path).toBe('second.txt');
      expect(result.entries[2].path).toBe('third.txt');
    });

    it('creates nested directories for subdirectory entries', async () => {
      const content = Buffer.from('nested file');
      const archive = buildSynthetic4sb([{ filename: 'subdir/nested/file.txt', data: content }]);

      const result = await extract4sb(archive, tmpDir);

      expect(result.entries[0].path).toBe('subdir/nested/file.txt');
      expect(existsSync(join(tmpDir, 'subdir', 'nested', 'file.txt'))).toBe(true);
    });

    it('reports correct decompressed size for each entry', async () => {
      const sizes = [10, 500, 1024];
      const archive = buildSynthetic4sb(
        sizes.map((n, i) => ({ filename: `file-${i}.bin`, data: Buffer.alloc(n, i) })),
      );

      const result = await extract4sb(archive, tmpDir);

      for (let i = 0; i < sizes.length; i++) {
        expect(result.entries[i].size).toBe(sizes[i]);
      }
    });
  });

  describe('ASCII header parsing', () => {
    it('parses space-padded sizes from the 32-byte header correctly', async () => {
      const content = Buffer.from('a'.repeat(42));
      const archive = buildSynthetic4sb([{ filename: 'size-test.txt', data: content }]);

      const result = await extract4sb(archive, tmpDir);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].size).toBe(42);
    });

    it('handles single-digit content size', async () => {
      const content = Buffer.from('X');
      const archive = buildSynthetic4sb([{ filename: 'tiny.txt', data: content }]);

      const result = await extract4sb(archive, tmpDir);

      expect(result.entries[0].size).toBe(1);
      expect(readFileSync(join(tmpDir, 'tiny.txt'))).toEqual(content);
    });
  });

  describe('path substitution', () => {
    it('replaces {%DOCUMENTS_DIR%}/ with documents/', async () => {
      const content = Buffer.from('pdf content');
      const archive = buildSynthetic4sb([
        { filename: '{%DOCUMENTS_DIR%}/test.pdf', data: content },
      ]);

      const result = await extract4sb(archive, tmpDir);

      expect(result.entries[0].path).toBe('documents/test.pdf');
      expect(existsSync(join(tmpDir, 'documents', 'test.pdf'))).toBe(true);
    });

    it('replaces {%AUX_DIR%}/ with aux/', async () => {
      const content = Buffer.from('image bytes');
      const archive = buildSynthetic4sb([{ filename: '{%AUX_DIR%}/test.png', data: content }]);

      const result = await extract4sb(archive, tmpDir);

      expect(result.entries[0].path).toBe('aux/test.png');
      expect(existsSync(join(tmpDir, 'aux', 'test.png'))).toBe(true);
    });

    it('handles both DOCUMENTS_DIR and AUX_DIR substitutions in the same archive', async () => {
      const archive = buildSynthetic4sb([
        { filename: '{%DOCUMENTS_DIR%}/doc.pdf', data: Buffer.from('pdf') },
        { filename: '{%AUX_DIR%}/img.png', data: Buffer.from('png') },
      ]);

      const result = await extract4sb(archive, tmpDir);

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].path).toBe('documents/doc.pdf');
      expect(result.entries[1].path).toBe('aux/img.png');
    });

    it('replaces pipe characters with underscores in filenames', async () => {
      const content = Buffer.from('data');
      const archive = buildSynthetic4sb([{ filename: 'some|pipe|name.txt', data: content }]);

      const result = await extract4sb(archive, tmpDir);

      expect(result.entries[0].path).toBe('some_pipe_name.txt');
    });
  });

  describe('error handling', () => {
    it('skips a corrupted gzip entry without throwing', async () => {
      const archive = Buffer.concat([
        ARCHIVE_TAG,
        buildRawEntryBytes('valid.txt', gzipSync(Buffer.from('valid content here'))),
        buildRawEntryBytes('corrupt.txt', Buffer.from('this is NOT valid gzip data')),
      ]);

      const result = await extract4sb(archive, tmpDir);

      expect(result.entries.some((e) => e.path === 'valid.txt')).toBe(true);
      expect(result.entries.some((e) => e.path === 'corrupt.txt')).toBe(false);
    });

    it('continues extracting valid entries after a corrupted entry', async () => {
      const archive = Buffer.concat([
        ARCHIVE_TAG,
        buildRawEntryBytes('before.txt', gzipSync(Buffer.from('before'))),
        buildRawEntryBytes('corrupt.txt', Buffer.from('NOT GZIP')),
        buildRawEntryBytes('after.txt', gzipSync(Buffer.from('after'))),
      ]);

      const result = await extract4sb(archive, tmpDir);

      expect(result.entries.some((e) => e.path === 'before.txt')).toBe(true);
      expect(result.entries.some((e) => e.path === 'corrupt.txt')).toBe(false);
      expect(result.entries.some((e) => e.path === 'after.txt')).toBe(true);
    });
  });
});
