import path from 'path';
import { DEFAULT_PORT, DEFAULT_HOST } from '@multimo/shared';

export interface HubConfig {
  port: number;
  host: string;
  dbPath: string;
  publicUrl: string;
  mobileDir: string;
}

export function loadConfig(): HubConfig {
  const port = parseInt(process.env.MULTIMO_PORT || String(DEFAULT_PORT), 10);
  const host = process.env.MULTIMO_HOST || DEFAULT_HOST;
  const dbPath = process.env.MULTIMO_DB_PATH || path.join(process.cwd(), 'data', 'multimo.db');
  const publicUrl = process.env.MULTIMO_PUBLIC_URL || `http://localhost:${port}`;
  const mobileDir = path.resolve(__dirname, '../../mobile/public');

  return { port, host, dbPath, publicUrl, mobileDir };
}
