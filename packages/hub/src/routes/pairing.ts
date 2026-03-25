import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { Agent, Pairing } from '@multimo/shared';
import { AgentStore } from '../db/agents';
import { PairingStore } from '../db/pairings';
import { agentAuth } from '../middleware/auth';
import { generateShortCode, generateQrPayload, getPairingExpiresAt } from '../services/pairing';
import { broadcast } from '../services/sse';

export function createPairingRoutes(agentStore: AgentStore, pairingStore: PairingStore, publicUrl: string): Router {
  const router = Router();

  // Initiate pairing (agent auth required)
  router.post('/initiate', agentAuth(agentStore), (req: Request, res: Response) => {
    const agent = (req as any).agent as Agent;

    const shortCode = generateShortCode();
    const qrPayload = generateQrPayload(publicUrl, shortCode);
    const expiresAt = getPairingExpiresAt();

    const pairing: Pairing = {
      id: uuid(),
      agent_id: agent.id,
      short_code: shortCode,
      qr_payload: qrPayload,
      status: 'pending',
      expires_at: expiresAt,
      confirmed_at: null,
      created_at: Date.now(),
    };

    pairingStore.create(pairing);

    res.json({
      short_code: shortCode,
      qr_payload: qrPayload,
      expires_at: expiresAt,
    });
  });

  // Confirm pairing (mobile UI, no agent auth)
  router.post('/confirm', (req: Request, res: Response) => {
    const { short_code } = req.body;
    if (!short_code) {
      res.status(400).json({ error: 'short_code required' });
      return;
    }

    const pairing = pairingStore.findByCode(short_code.toUpperCase());
    if (!pairing) {
      res.status(404).json({ error: 'Invalid or expired pairing code' });
      return;
    }

    if (pairing.expires_at < Date.now()) {
      res.status(410).json({ error: 'Pairing code expired' });
      return;
    }

    pairingStore.confirm(pairing.id);
    agentStore.updateStatus(pairing.agent_id, 'idle');

    const agent = agentStore.findById(pairing.agent_id);
    broadcast('pairing:confirmed', {
      agentId: pairing.agent_id,
      agentName: agent?.name,
    });

    res.json({
      ok: true,
      agent: agent ? { id: agent.id, name: agent.name, agent_type: agent.agent_type } : null,
    });
  });

  // Check pairing status (agent polls this)
  router.get('/status/:code', agentAuth(agentStore), (req: Request, res: Response) => {
    const pairing = pairingStore.findByCode(req.params.code.toUpperCase());
    if (!pairing) {
      // Check if it was confirmed
      const agent = (req as any).agent as Agent;
      const agentPairing = pairingStore.findByAgent(agent.id);
      if (!agentPairing) {
        res.status(404).json({ error: 'Pairing not found' });
        return;
      }
      res.json({ status: agentPairing.status });
      return;
    }

    if (pairing.expires_at < Date.now()) {
      res.json({ status: 'expired' });
      return;
    }

    res.json({ status: pairing.status });
  });

  return router;
}
