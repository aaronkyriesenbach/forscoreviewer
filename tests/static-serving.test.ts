import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import type { Hono } from 'hono';

import { createApp } from '@/server/app';

describe('static file serving', () => {
  let tmpDataDir: string;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    tmpDataDir = mkdtempSync(join(os.tmpdir(), 'static-test-'));
    app = createApp(tmpDataDir);
  });

  afterEach(() => {
    const libDir = join(tmpDataDir, 'libraries');
    if (existsSync(libDir)) {
      rmSync(libDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    rmSync(tmpDataDir, { recursive: true, force: true });
  });

  function seedDocument(library: string, filename: string, content: string): void {
    const dir = join(tmpDataDir, 'libraries', library, 'documents');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, filename), content);
  }

  function seedAux(library: string, filename: string, content: string): void {
    const dir = join(tmpDataDir, 'libraries', library, 'aux');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, filename), content);
  }

  describe('/data/:library/documents/*', () => {
    it('returns PDF with application/pdf content-type', async () => {
      seedDocument('my-lib', 'score.pdf', '%PDF-1.4 fake content');

      const res = await app.request('/data/my-lib/documents/score.pdf');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
    });

    it('returns 404 for nonexistent file', async () => {
      mkdirSync(join(tmpDataDir, 'libraries', 'my-lib', 'documents'), { recursive: true });

      const res = await app.request('/data/my-lib/documents/nope.pdf');
      expect(res.status).toBe(404);
    });

    it('handles URL-encoded filenames with special characters', async () => {
      seedDocument('my-lib', '11 Bagatelles, Op.119.pdf', 'pdf data');

      const res = await app.request(
        '/data/my-lib/documents/11%20Bagatelles%2C%20Op.119.pdf',
      );
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
    });

    it('returns non-PDF files with application/octet-stream', async () => {
      seedDocument('my-lib', 'readme.txt', 'hello');

      const res = await app.request('/data/my-lib/documents/readme.txt');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/octet-stream');
    });
  });

  describe('/data/:library/aux/*', () => {
    it('returns PNG with image/png content-type', async () => {
      seedAux('my-lib', 'score.pdf_1.png', 'fake png');

      const res = await app.request('/data/my-lib/aux/score.pdf_1.png');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('image/png');
    });

    it('returns JPG with image/jpeg content-type', async () => {
      seedAux('my-lib', 'photo.jpg', 'fake jpg');

      const res = await app.request('/data/my-lib/aux/photo.jpg');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('image/jpeg');
    });

    it('returns JPEG with image/jpeg content-type', async () => {
      seedAux('my-lib', 'photo.jpeg', 'fake jpeg');

      const res = await app.request('/data/my-lib/aux/photo.jpeg');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('image/jpeg');
    });

    it('returns 404 for nonexistent aux file', async () => {
      mkdirSync(join(tmpDataDir, 'libraries', 'my-lib', 'aux'), { recursive: true });

      const res = await app.request('/data/my-lib/aux/nope.png');
      expect(res.status).toBe(404);
    });
  });

  describe('SPA fallback', () => {
    it('serves index.html for unknown routes when dist/client exists', async () => {
      const res = await app.request('/some/unknown/route');
      expect(res.status).toBe(200);
      const text = await res.text();
      const isIndexHtml = text.includes('<div id="root">');
      const isNotBuilt = text.includes('Client not built yet');
      expect(isIndexHtml || isNotBuilt).toBe(true);
    });
  });
});
