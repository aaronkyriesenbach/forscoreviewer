import { cpSync, mkdirSync } from 'fs';
import { join } from 'path';

export default function globalSetup() {
  const dataDir = process.env.DATA_DIR ?? '/data';
  const targetDir = join(dataDir, 'libraries', 'e2e-library');
  const fixtureDir = join(__dirname, 'fixtures');

  mkdirSync(join(dataDir, 'libraries'), { recursive: true });

  cpSync(fixtureDir, targetDir, { recursive: true, force: true });
}
