import { Request, Response, NextFunction } from 'express';
import { AgentStore } from '../db/agents';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from '@multimo/shared';

// In-memory session store (simple, restarts clear sessions)
const sessions = new Map<string, { createdAt: number }>();

export function agentAuth(agentStore: AgentStore) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }
    const token = authHeader.slice(7);
    const agent = agentStore.findByToken(token);
    if (!agent) {
      res.status(401).json({ error: 'Invalid agent token' });
      return;
    }
    (req as any).agent = agent;
    next();
  };
}

export function getPasswordHash(db: Database.Database): string | null {
  const row = db.prepare("SELECT value FROM hub_config WHERE key = 'password_hash'").get() as { value: string } | undefined;
  return row?.value || null;
}

export function setPasswordHash(db: Database.Database, password: string): void {
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("INSERT OR REPLACE INTO hub_config (key, value) VALUES ('password_hash', ?)").run(hash);
}

export function isSetup(db: Database.Database): boolean {
  return getPasswordHash(db) !== null;
}

export function verifyPassword(db: Database.Database, password: string): boolean {
  const hash = getPasswordHash(db);
  if (!hash) return false;
  return bcrypt.compareSync(password, hash);
}

export function createSession(): string {
  const id = crypto.randomBytes(32).toString('hex');
  sessions.set(id, { createdAt: Date.now() });
  return id;
}

export function mobileAuth(db: Database.Database) {
  return (req: Request, res: Response, next: NextFunction) => {
    // If no password is set, allow all access (first-time setup)
    if (!isSetup(db)) {
      next();
      return;
    }

    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      if (Date.now() - session.createdAt < SESSION_MAX_AGE_MS) {
        next();
        return;
      }
      sessions.delete(sessionId);
    }

    res.status(401).json({ error: 'Not authenticated', needsLogin: true });
  };
}
