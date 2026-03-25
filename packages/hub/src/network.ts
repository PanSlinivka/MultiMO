import os from 'os';
import { execSync, spawn, ChildProcess } from 'child_process';
import http from 'http';

/**
 * Get the local network IP address (not 127.0.0.1)
 */
export function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

/**
 * Check if cloudflared is installed
 */
export function isCloudflaredInstalled(): boolean {
  try {
    execSync('cloudflared --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Start a Cloudflare quick tunnel and return the public URL.
 * Returns null if cloudflared is not installed or tunnel fails.
 */
export function startCloudflareTunnel(port: number): Promise<string | null> {
  return new Promise((resolve) => {
    if (!isCloudflaredInstalled()) {
      resolve(null);
      return;
    }

    let resolved = false;
    const child: ChildProcess = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 30000); // 30s timeout

    // cloudflared prints the URL to stderr
    child.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(match[0]);
      }
    });

    child.on('error', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(null);
      }
    });

    child.on('exit', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(null);
      }
    });

    // Keep reference to kill on process exit
    process.on('exit', () => child.kill());
    process.on('SIGINT', () => { child.kill(); process.exit(0); });
  });
}

/**
 * Generate a simple terminal QR code (ASCII art) for a URL.
 * Uses the qrcode package which is already a dependency.
 */
export async function printQRCode(url: string): Promise<void> {
  try {
    const QRCode = require('qrcode');
    const qr = await QRCode.toString(url, { type: 'terminal', small: true });
    console.log(qr);
  } catch {
    // QR code display is nice-to-have, not critical
    console.log(`  URL: ${url}`);
  }
}
