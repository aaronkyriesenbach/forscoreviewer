import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';

import { extract4sb } from '@/server/parser/four-sb';
import { transformPlistToMetadata } from '@/server/parser/metadata';
import type { UploadResponse } from '@/shared/types';

const DATA_DIR = process.env.DATA_DIR ?? '/data';
const MAX_UPLOAD_SIZE = 1024 * 1024 * 1024;

export const uploadRouter = new Hono();

uploadRouter.use(bodyLimit({ maxSize: MAX_UPLOAD_SIZE }));

uploadRouter.post('/:name/upload', async (c) => {
  const name = c.req.param('name');
  const tempDir = join(DATA_DIR, 'libraries', `.tmp-${name}-${Date.now()}`);
  let tempCreated = false;

  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (file === null || typeof file === 'string') {
      return c.json({ error: 'Missing file field' }, 400);
    }

    if (!file.name.endsWith('.4sb')) {
      return c.json({ error: 'Invalid file extension: expected .4sb' }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    mkdirSync(tempDir, { recursive: true });
    tempCreated = true;

    const archivesDir = join(tempDir, 'archives');
    mkdirSync(archivesDir, { recursive: true });
    writeFileSync(join(archivesDir, `archive-${Date.now()}.4sb`), buf);

    let plistData: Uint8Array;
    let scoreCount: number;

    try {
      const { entries, plistData: rawPlist } = await extract4sb(buf, tempDir);
      plistData = rawPlist;
      scoreCount = entries.filter((e) => e.path.startsWith('documents/')).length;
    } catch (extractErr: unknown) {
      const msg = extractErr instanceof Error ? extractErr.message : String(extractErr);
      return c.json({ error: `Invalid archive: ${msg}` }, 400);
    }

    let metadata;
    try {
      metadata = transformPlistToMetadata(plistData);
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      return c.json({ error: `Failed to parse metadata: ${msg}` }, 400);
    }

    writeFileSync(join(tempDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    const setlistCount = Object.keys(metadata.setlists).length;
    scoreCount = Object.keys(metadata.scores).length;

    const finalDir = join(DATA_DIR, 'libraries', name);
    const oldArchivesDir = join(finalDir, 'archives');
    const tempArchivesBackup = join(DATA_DIR, 'libraries', `.tmp-archives-${name}-${Date.now()}`);
    let hasOldArchives = false;

    if (existsSync(oldArchivesDir)) {
      renameSync(oldArchivesDir, tempArchivesBackup);
      hasOldArchives = true;
    }

    if (existsSync(finalDir)) {
      rmSync(finalDir, { recursive: true, force: true });
    }

    renameSync(tempDir, finalDir);

    if (hasOldArchives) {
      const newArchivesDir = join(finalDir, 'archives');
      for (const file of readdirSync(tempArchivesBackup)) {
        renameSync(join(tempArchivesBackup, file), join(newArchivesDir, file));
      }
      rmSync(tempArchivesBackup, { recursive: true, force: true });
    }
    tempCreated = false;

    const response: UploadResponse = {
      success: true,
      library: name,
      scoreCount,
      setlistCount,
    };

    return c.json(response, 200);
  } catch (err: unknown) {
    if (tempCreated) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }

    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: `Internal server error: ${msg}` }, 500);
  }
});
