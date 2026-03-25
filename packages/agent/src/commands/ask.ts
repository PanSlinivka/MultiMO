import { getHubUrl, getAgentToken } from '../config';
import { request, authHeaders } from '../http';

export async function askCommand(question: string): Promise<void> {
  const hubUrl = getHubUrl();
  const token = getAgentToken();

  if (!token) {
    console.error('Agent not installed in this repo. Run "multimo-agent start --hub <url>" in the project root first.');
    process.exit(1);
  }

  try {
    // Send question
    await request({
      url: `${hubUrl}/api/agents/me/message`,
      method: 'POST',
      headers: authHeaders(token),
      body: {
        content: question,
        message_type: 'question',
      },
    });

    console.error('Question sent. Waiting for answer...');

    // Poll for answer
    const startTime = Date.now();
    const TIMEOUT = 10 * 60 * 1000; // 10 minutes

    while (Date.now() - startTime < TIMEOUT) {
      const res = await request({
        url: `${hubUrl}/api/agents/me/poll-answer`,
        headers: authHeaders(token),
      });

      if (res.status === 200 && res.data?.answer) {
        // Output answer to stdout for the AI agent
        console.log(res.data.answer);
        return;
      }

      // Wait 3 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.error('Timeout waiting for answer (10 minutes).');
    process.exit(1);
  } catch (err: any) {
    console.error(`Failed to connect to hub: ${err.message}`);
    process.exit(1);
  }
}
