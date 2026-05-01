import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { Hono } from 'hono';
import type { LibraryInfo, LibraryMetadata } from '@/shared/types';

describe('libraries routes', () => {
  let tmpDir: string;
  let app: InstanceType<typeof Hono>;

  beforeAll(async () => {
    tmpDir = mkdtempSync(join(os.tmpdir(), 'lib-route-test-'));
    process.env.DATA_DIR = tmpDir;

    const { librariesRouter } = await import('@/server/routes/libraries');
    app = new Hono();
    app.route('/api/libraries', librariesRouter);
  });

  afterEach(() => {
    const libDir = join(tmpDir, 'libraries');
    if (existsSync(libDir)) {
      rmSync(libDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.DATA_DIR;
  });

  function seedLibrary(name: string, metadata: LibraryMetadata): void {
    const dir = join(tmpDir, 'libraries', name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'metadata.json'), JSON.stringify(metadata));
  }

  const minimalMetadata: LibraryMetadata = {
    scores: { 'test.pdf': { title: 'Test' } },
    setlists: { Recital: [{ title: 'Item', file: 'test.pdf' }] },
  };

  describe('GET /', () => {
    it('returns empty array when libraries dir does not exist', async () => {
      const res = await app.request('/api/libraries');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
    });

    it('returns libraries with scoreCount and setlistCount', async () => {
      seedLibrary('my-lib', minimalMetadata);

      const res = await app.request('/api/libraries');
      const body = (await res.json()) as LibraryInfo[];
      expect(body).toHaveLength(1);
      expect(body[0]).toEqual({
        name: 'my-lib',
        scoreCount: 1,
        setlistCount: 1,
      });
    });

    it('skips directories starting with .tmp-', async () => {
      seedLibrary('.tmp-uploading', minimalMetadata);
      seedLibrary('real-lib', minimalMetadata);

      const res = await app.request('/api/libraries');
      const body = (await res.json()) as LibraryInfo[];
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe('real-lib');
    });

    it('skips directories without metadata.json', async () => {
      mkdirSync(join(tmpDir, 'libraries', 'empty-lib'), { recursive: true });
      seedLibrary('valid-lib', minimalMetadata);

      const res = await app.request('/api/libraries');
      const body = (await res.json()) as LibraryInfo[];
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe('valid-lib');
    });
  });

  describe('GET /:name/metadata', () => {
    it('returns 404 for nonexistent library', async () => {
      mkdirSync(join(tmpDir, 'libraries'), { recursive: true });
      const res = await app.request('/api/libraries/nonexistent/metadata');
      expect(res.status).toBe(404);
    });

    it('returns parsed metadata.json', async () => {
      seedLibrary('my-lib', minimalMetadata);

      const res = await app.request('/api/libraries/my-lib/metadata');
      expect(res.status).toBe(200);
      const body = (await res.json()) as LibraryMetadata;
      expect(Object.keys(body.scores)).toHaveLength(1);
      expect(body.scores['test.pdf'].title).toBe('Test');
    });
  });

  describe('GET /:name/annotations', () => {
    it('returns empty array when aux dir is missing', async () => {
      seedLibrary('my-lib', minimalMetadata);

      const res = await app.request('/api/libraries/my-lib/annotations');
      expect(res.status).toBe(200);
      const body = (await res.json()) as { annotations: string[] };
      expect(body.annotations).toEqual([]);
    });

    it('returns only .png files from aux dir', async () => {
      seedLibrary('my-lib', minimalMetadata);
      const auxDir = join(tmpDir, 'libraries', 'my-lib', 'aux');
      mkdirSync(auxDir, { recursive: true });
      writeFileSync(join(auxDir, 'score.pdf_1.png'), 'png');
      writeFileSync(join(auxDir, 'score.pdf_2.png'), 'png');
      writeFileSync(join(auxDir, 'thumbs.db'), 'junk');

      const res = await app.request('/api/libraries/my-lib/annotations');
      const body = (await res.json()) as { annotations: string[] };
      expect(body.annotations).toHaveLength(2);
      expect(body.annotations.every((f: string) => f.endsWith('.png'))).toBe(true);
    });
  });

  describe('DELETE /:name', () => {
    it('returns 404 for nonexistent library', async () => {
      mkdirSync(join(tmpDir, 'libraries'), { recursive: true });
      const res = await app.request('/api/libraries/nonexistent', { method: 'DELETE' });
      expect(res.status).toBe(404);
    });

    it('removes directory and returns success', async () => {
      seedLibrary('doomed-lib', minimalMetadata);
      expect(existsSync(join(tmpDir, 'libraries', 'doomed-lib'))).toBe(true);

      const res = await app.request('/api/libraries/doomed-lib', { method: 'DELETE' });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean };
      expect(body.success).toBe(true);
      expect(existsSync(join(tmpDir, 'libraries', 'doomed-lib'))).toBe(false);
    });
  });
});
