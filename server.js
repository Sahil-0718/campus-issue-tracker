import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { createApp } from './src/app.js';

const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'tracker.db');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');

mkdirSync(path.dirname(DB_PATH), { recursive: true });
const { server } = createApp({ dbPath: DB_PATH, uploadDir: UPLOAD_DIR });

server.listen(PORT, () => console.log(`Campus Issue Tracker running on http://localhost:${PORT}`));

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
