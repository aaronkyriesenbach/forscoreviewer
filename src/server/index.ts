import { serve } from '@hono/node-server';

import { createApp } from './app';

const DATA_DIR = process.env.DATA_DIR ?? '/data';
const PORT = parseInt(process.env.PORT ?? '3000', 10);

const app = createApp(DATA_DIR);

serve({ fetch: app.fetch, port: PORT });
