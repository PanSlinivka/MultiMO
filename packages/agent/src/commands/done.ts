import { getHubUrl, getAgentToken } from '../config';
import { request, authHeaders } from '../http';

export async function doneCommand(summary: string): Promise<void> {
  const hubUrl = getHubUrl();
  const token = getAgentToken();

  if (!token) {
    console.error('Agent not installed in this repo. Run "multimo-agent start --hub <url>" in the project root first.');
    process.exit(1);
  }

  try {
    // Send completion message
    const res = await request({
      url: `${hubUrl}/api/agents/me/message`,
      method: 'POST',
      headers: authHeaders(token),
      body: {
        content: summary,
        message_type: 'completion',
      },
    });

    if (res.status === 200) {
      console.log('Task completion reported successfully.');
    } else {
      console.error('Error reporting completion:', res.data);
    }
  } catch (err: any) {
    console.error(`Failed to connect to hub: ${err.message}`);
    process.exit(1);
  }
}
