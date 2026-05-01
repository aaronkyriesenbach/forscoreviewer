import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Readable } from 'node:stream';

import { Hono } from 'hono';

import { librariesRouter } from './routes/libraries';
import { uploadRouter } from './routes/upload';

export function createApp(dataDir: string) {
  const app = new Hono();

  app.route('/api/libraries', librariesRouter);
  app.route('/api/libraries', uploadRouter);

  app.get('/data/:library/documents/*', (c) => {
    const library = c.req.param('library');
    // c.req.param('*') returns undefined in Hono v4.12.16 — extract from c.req.path instead
    const prefix = `/data/${library}/documents/`;
    const rawPath = decodeURIComponent(c.req.path.slice(prefix.length)).normalize('NFD');
    const filePath = join(dataDir, 'libraries', library, 'documents', rawPath);

    if (!existsSync(filePath)) return c.notFound();
    const stat = statSync(filePath);
    if (!stat.isFile()) return c.notFound();

    const contentType =
      extname(filePath).toLowerCase() === '.pdf' ? 'application/pdf' : 'application/octet-stream';
    const webStream = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
      },
    });
  });

  app.get('/data/:library/aux/*', (c) => {
    const library = c.req.param('library');
    // c.req.param('*') returns undefined in Hono v4.12.16 — extract from c.req.path instead
    const prefix = `/data/${library}/aux/`;
    const rawPath = decodeURIComponent(c.req.path.slice(prefix.length)).normalize('NFD');
    const filePath = join(dataDir, 'libraries', library, 'aux', rawPath);

    if (!existsSync(filePath)) return c.notFound();
    const stat = statSync(filePath);
    if (!stat.isFile()) return c.notFound();

    const ext = extname(filePath).toLowerCase();
    const contentType =
      ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : 'application/octet-stream';
    const webStream = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
      },
    });
  });

  app.get('*', (c) => {
    const distDir = join(process.cwd(), 'dist', 'client');

    // Try serving a static file from dist/client/ first
    const requestPath = c.req.path === '/' ? '/index.html' : c.req.path;
    const staticFilePath = join(distDir, requestPath);

    // Security: make sure resolved path is within distDir
    if (staticFilePath.startsWith(distDir) && existsSync(staticFilePath) && statSync(staticFilePath).isFile()) {
      const ext = extname(staticFilePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html; charset=UTF-8',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.json': 'application/json',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const stat = statSync(staticFilePath);
      const webStream = Readable.toWeb(createReadStream(staticFilePath)) as ReadableStream<Uint8Array>;
      return new Response(webStream, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': stat.size.toString(),
        },
      });
    }

    // SPA fallback: serve index.html for all other routes
    const indexPath = join(distDir, 'index.html');
    if (!existsSync(indexPath)) {
      return c.html('<html><body><p>Client not built yet.</p></body></html>', 200);
    }
    const html = readFileSync(indexPath).toString();
    return c.html(html, 200);
  });

  return app;
}
