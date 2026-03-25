import { Response } from 'express';
import { SSEEventType } from '@multimo/shared';

const clients: Set<Response> = new Set();

export function addSSEClient(res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.write(':\n\n'); // heartbeat comment
  clients.add(res);

  res.on('close', () => {
    clients.delete(res);
  });
}

export function broadcast(type: SSEEventType, data: Record<string, unknown>): void {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

export function getClientCount(): number {
  return clients.size;
}
