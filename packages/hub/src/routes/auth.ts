import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from '@multimo/shared';
import { isSetup, setPasswordHash, verifyPassword, createSession } from '../middleware/auth';

export function createAuthRoutes(db: Database.Database): Router {
  const router = Router();

  // Check if hub is set up
  router.get('/status', (_req: Request, res: Response) => {
    res.json({ setup: isSetup(db) });
  });

  // Initial setup - set password
  router.post('/setup', (req: Request, res: Response) => {
    if (isSetup(db)) {
      res.status(400).json({ error: 'Already set up' });
      return;
    }
    const { password } = req.body;
    if (!password || password.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters' });
      return;
    }
    setPasswordHash(db, password);

    const sessionId = createSession();
    res.cookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: SESSION_MAX_AGE_MS,
    });

    res.json({ ok: true });
  });

  // Login
  router.post('/login', (req: Request, res: Response) => {
    const { password } = req.body;
    if (!verifyPassword(db, password)) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    const sessionId = createSession();
    res.cookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: SESSION_MAX_AGE_MS,
    });

    res.json({ ok: true });
  });

  return router;
}
