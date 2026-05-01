import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { Hono } from 'hono';
import type { ExtractResult } from '@/server/parser/four-sb';
import type { LibraryMetadata, UploadResponse } from '@/shared/types';

vi.mock('@/server/parser/four-sb', () => ({
  extract4sb: vi.fn(),
}));

vi.mock('@/server/parser/metadata', () => ({
  transformPlistToMetadata: vi.fn(),
}));

const testMetadata: LibraryMetadata = {
  scores: {
    'doc1.pdf': { title: 'Doc 1' },
    'doc2.pdf': { title: 'Doc 2' },
  },
  setlists: { Recital: [{ title: 'Item 1', file: 'doc1.pdf' }] },
};

describe('upload routes', () => {
  let tmpDir: string;
  let app: InstanceType<typeof Hono>;
  let mockExtract: ReturnType<typeof vi.fn>;
  let mockTransform: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    tmpDir = mkdtempSync(join(os.tmpdir(), 'upload-test-'));
    process.env.DATA_DIR = tmpDir;

    const fourSb = await import('@/server/parser/four-sb');
    const metadata = await import('@/server/parser/metadata');
    mockExtract = vi.mocked(fourSb.extract4sb);
    mockTransform = vi.mocked(metadata.transformPlistToMetadata);

    const { uploadRouter } = await import('@/server/routes/upload');
    app = new Hono();
    app.route('/api/libraries', uploadRouter);
  });

  afterEach(() => {
    mockExtract.mockReset();
    mockTransform.mockReset();
    const libDir = join(tmpDir, 'libraries');
    if (existsSync(libDir)) {
      rmSync(libDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.DATA_DIR;
  });

  function makeFormData(filename: string, content: string): FormData {
    const formData = new FormData();
    formData.append('file', new File([content], filename));
    return formData;
  }

  function setupMocksForSuccess(): void {
    const result: ExtractResult = {
      entries: [
        { path: 'documents/doc1.pdf', size: 100 },
        { path: 'documents/doc2.pdf', size: 200 },
        { path: 'aux/doc1.pdf_1.png', size: 50 },
      ],
      plistData: new Uint8Array([1, 2, 3]),
    };
    mockExtract.mockResolvedValue(result);
    mockTransform.mockReturnValue(testMetadata);
  }

  it('returns 400 when no file field in form data', async () => {
    const formData = new FormData();
    const res = await app.request('/api/libraries/test-lib/upload', {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Missing file');
  });

  it('returns 400 when file extension is not .4sb', async () => {
    const res = await app.request('/api/libraries/test-lib/upload', {
      method: 'POST',
      body: makeFormData('test.zip', 'fake'),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('.4sb');
  });

  it('returns 400 when archive extraction fails', async () => {
    mockExtract.mockRejectedValue(new Error('Bad archive'));

    const res = await app.request('/api/libraries/test-lib/upload', {
      method: 'POST',
      body: makeFormData('test.4sb', 'bad data'),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Bad archive');
  });

  it('returns 400 when metadata parsing fails', async () => {
    mockExtract.mockResolvedValue({
      entries: [],
      plistData: new Uint8Array(),
    });
    mockTransform.mockImplementation(() => {
      throw new Error('Invalid plist');
    });

    const res = await app.request('/api/libraries/test-lib/upload', {
      method: 'POST',
      body: makeFormData('test.4sb', 'data'),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Invalid plist');
  });

  it('creates library directory with metadata.json on success', async () => {
    setupMocksForSuccess();

    const res = await app.request('/api/libraries/new-lib/upload', {
      method: 'POST',
      body: makeFormData('test.4sb', 'archive data'),
    });
    expect(res.status).toBe(200);

    const libDir = join(tmpDir, 'libraries', 'new-lib');
    expect(existsSync(libDir)).toBe(true);
    expect(existsSync(join(libDir, 'metadata.json'))).toBe(true);

    const savedMetadata = JSON.parse(readFileSync(join(libDir, 'metadata.json'), 'utf-8'));
    expect(Object.keys(savedMetadata.scores)).toHaveLength(2);
  });

  it('returns scoreCount and setlistCount in response', async () => {
    setupMocksForSuccess();

    const res = await app.request('/api/libraries/new-lib/upload', {
      method: 'POST',
      body: makeFormData('test.4sb', 'archive data'),
    });
    const body = (await res.json()) as UploadResponse;
    expect(body.success).toBe(true);
    expect(body.library).toBe('new-lib');
    expect(body.scoreCount).toBe(2);
    expect(body.setlistCount).toBe(1);
  });

  it('saves .4sb to archives/ subdirectory', async () => {
    setupMocksForSuccess();

    await app.request('/api/libraries/new-lib/upload', {
      method: 'POST',
      body: makeFormData('test.4sb', 'archive content'),
    });

    const archivesDir = join(tmpDir, 'libraries', 'new-lib', 'archives');
    expect(existsSync(archivesDir)).toBe(true);
    const archives = readdirSync(archivesDir);
    expect(archives).toHaveLength(1);
    expect(archives[0]).toMatch(/^archive-\d+\.4sb$/);
  });

  it('preserves old archives on re-upload', async () => {
    setupMocksForSuccess();

    await app.request('/api/libraries/re-lib/upload', {
      method: 'POST',
      body: makeFormData('first.4sb', 'first archive'),
    });

    const archivesDir = join(tmpDir, 'libraries', 're-lib', 'archives');
    writeFileSync(join(archivesDir, 'old-archive.4sb'), 'old data');
    const beforeCount = readdirSync(archivesDir).length;
    expect(beforeCount).toBeGreaterThanOrEqual(2);

    setupMocksForSuccess();

    await app.request('/api/libraries/re-lib/upload', {
      method: 'POST',
      body: makeFormData('second.4sb', 'second archive'),
    });
    const allArchives = readdirSync(join(tmpDir, 'libraries', 're-lib', 'archives'));
    expect(allArchives).toContain('old-archive.4sb');
    expect(allArchives.length).toBeGreaterThanOrEqual(2);
  });

  it('returns 400 with descriptive error on extraction failure', async () => {
    mockExtract.mockRejectedValue(new Error('corrupt archive'));

    const res = await app.request('/api/libraries/fail-lib/upload', {
      method: 'POST',
      body: makeFormData('test.4sb', 'data'),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('corrupt archive');
  });

  it('returns 400 with descriptive error on metadata parse failure', async () => {
    mockExtract.mockResolvedValue({ entries: [], plistData: new Uint8Array() });
    mockTransform.mockImplementation(() => {
      throw new Error('bad plist format');
    });

    const res = await app.request('/api/libraries/fail-lib/upload', {
      method: 'POST',
      body: makeFormData('test.4sb', 'data'),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('bad plist format');
  });
});
