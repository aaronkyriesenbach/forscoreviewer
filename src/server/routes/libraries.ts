import { Hono } from 'hono';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { LibraryInfo, LibraryMetadata } from '@/shared/types';

const DATA_DIR = process.env.DATA_DIR ?? '/data';

export const librariesRouter = new Hono();

librariesRouter.get('/', (c) => {
  const librariesDir = join(DATA_DIR, 'libraries');

  if (!existsSync(librariesDir)) {
    return c.json<LibraryInfo[]>([]);
  }

  const libraries: LibraryInfo[] = [];
  const entries = readdirSync(librariesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.tmp-')) continue;

    const metadataPath = join(librariesDir, entry.name, 'metadata.json');
    if (!existsSync(metadataPath)) continue;

    const metadata = JSON.parse(readFileSync(metadataPath).toString()) as LibraryMetadata;

    libraries.push({
      name: entry.name,
      scoreCount: Object.keys(metadata.scores).length,
      setlistCount: Object.keys(metadata.setlists).length,
    });
  }

  return c.json<LibraryInfo[]>(libraries);
});

librariesRouter.get('/:name/metadata', (c) => {
  const name = c.req.param('name');
  const metadataPath = join(DATA_DIR, 'libraries', name, 'metadata.json');

  if (!existsSync(metadataPath)) {
    return c.json({ error: 'Library not found' }, 404);
  }

  const metadata = JSON.parse(readFileSync(metadataPath).toString()) as LibraryMetadata;
  return c.json<LibraryMetadata>(metadata);
});

librariesRouter.get('/:name/annotations', (c) => {
  const name = c.req.param('name');
  const auxDir = join(DATA_DIR, 'libraries', name, 'aux');

  if (!existsSync(auxDir)) {
    return c.json({ annotations: [] as string[] });
  }

  const files = readdirSync(auxDir).filter((file) => file.endsWith('.png'));
  return c.json({ annotations: files });
});

librariesRouter.delete('/:name', (c) => {
  const name = c.req.param('name');
  const libraryDir = join(DATA_DIR, 'libraries', name);

  if (!existsSync(libraryDir)) {
    return c.json({ error: 'Library not found' }, 404);
  }

  rmSync(libraryDir, { recursive: true, force: true });
  return c.json({ success: true }, 200);
});
