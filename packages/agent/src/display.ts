import qrTerminal from 'qrcode-terminal';

export function displayPairing(shortCode: string, qrPayload: string, expiresAt: number): void {
  const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║         MultiMO Agent v0.1           ║');
  console.log('╠══════════════════════════════════════╣');

  // Display QR code
  qrTerminal.generate(qrPayload, { small: true }, (qr: string) => {
    const lines = qr.split('\n');
    for (const line of lines) {
      console.log('║  ' + line);
    }
  });

  console.log('║                                      ║');
  console.log(`║     PAIRING CODE: ${shortCode}            ║`);
  console.log('║                                      ║');
  console.log('║  Scan QR or enter code on phone      ║');
  console.log(`║  Expires in ${minutes}:${seconds.toString().padStart(2, '0')}                      ║`);
  console.log('╚══════════════════════════════════════╝');
  console.log('');
}

export function displayConnected(name: string): void {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log(`║  ✓ Agent "${name}" paired!`);
  console.log('║  Waiting for tasks...                ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
}

export function displayTask(title: string, description: string | null): void {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log(`║  NEW TASK: ${title}`);
  if (description) {
    console.log(`║  ${description.substring(0, 60)}`);
  }
  console.log('╚══════════════════════════════════════╝');
  console.log('');
}
