import { Router, Request, Response } from 'express';
import { addSSEClient } from '../services/sse';

export function createSSERoutes(): Router {
  const router = Router();

  router.get('/events', (req: Request, res: Response) => {
    addSSEClient(res);

    // Send keepalive every 30s
    const keepalive = setInterval(() => {
      res.write(':\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(keepalive);
    });
  });

  return router;
}
