import Database from 'better-sqlite3';
import { Pairing, PAIRING_MAX_ATTEMPTS } from '@multimo/shared';

export class PairingStore {
  constructor(private db: Database.Database) {}

  create(pairing: Pairing): void {
    this.db.prepare(`
      INSERT INTO pairings (id, agent_id, short_code, qr_payload, status, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(pairing.id, pairing.agent_id, pairing.short_code, pairing.qr_payload, pairing.status, pairing.expires_at, pairing.created_at);
  }

  findByCode(shortCode: string): Pairing | undefined {
    return this.db.prepare(
      "SELECT * FROM pairings WHERE short_code = ? AND status = 'pending'"
    ).get(shortCode) as Pairing | undefined;
  }

  findByAgent(agentId: string): Pairing | undefined {
    return this.db.prepare(
      "SELECT * FROM pairings WHERE agent_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
    ).get(agentId) as Pairing | undefined;
  }

  confirm(id: string): void {
    this.db.prepare(
      "UPDATE pairings SET status = 'confirmed', confirmed_at = ? WHERE id = ?"
    ).run(Date.now(), id);
  }

  incrementAttempts(id: string): number {
    this.db.prepare('UPDATE pairings SET attempts = attempts + 1 WHERE id = ?').run(id);
    const row = this.db.prepare('SELECT attempts FROM pairings WHERE id = ?').get(id) as { attempts: number } | undefined;
    const attempts = row?.attempts || 0;
    if (attempts >= PAIRING_MAX_ATTEMPTS) {
      this.db.prepare("UPDATE pairings SET status = 'expired' WHERE id = ?").run(id);
    }
    return attempts;
  }

  cleanupExpired(): number {
    const result = this.db.prepare(
      "DELETE FROM pairings WHERE status = 'pending' AND expires_at < ?"
    ).run(Date.now());
    return result.changes;
  }
}
