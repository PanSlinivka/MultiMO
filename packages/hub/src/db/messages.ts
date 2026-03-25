import Database from 'better-sqlite3';
import { AgentMessage } from '@multimo/shared';

export class MessageStore {
  constructor(private db: Database.Database) {}

  create(msg: AgentMessage): void {
    this.db.prepare(`
      INSERT INTO messages (id, agent_id, direction, content, message_type, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(msg.id, msg.agent_id, msg.direction, msg.content, msg.message_type, msg.read ? 1 : 0, msg.created_at);
  }

  findByAgent(agentId: string, limit = 50): AgentMessage[] {
    return this.db.prepare(
      'SELECT * FROM messages WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(agentId, limit) as AgentMessage[];
  }

  findUnreadForAgent(agentId: string, direction: string): AgentMessage | undefined {
    return this.db.prepare(
      'SELECT * FROM messages WHERE agent_id = ? AND direction = ? AND read = 0 ORDER BY created_at ASC LIMIT 1'
    ).get(agentId, direction) as AgentMessage | undefined;
  }

  markRead(id: string): void {
    this.db.prepare('UPDATE messages SET read = 1 WHERE id = ?').run(id);
  }

  getUnreadCount(agentId: string): number {
    const row = this.db.prepare(
      "SELECT COUNT(*) as count FROM messages WHERE agent_id = ? AND direction = 'agent_to_user' AND read = 0"
    ).get(agentId) as { count: number };
    return row.count;
  }
}
