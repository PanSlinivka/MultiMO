import { getHubUrl, getAgentToken } from '../config';
import { request, authHeaders } from '../http';

export async function nextCommand(): Promise<void> {
  const hubUrl = getHubUrl();
  const token = getAgentToken();

  if (!token) {
    console.error('Agent not installed in this repo. Run "multimo-agent start --hub <url>" in the project root first.');
    process.exit(1);
  }

  try {
    const res = await request({
      url: `${hubUrl}/api/agents/me/request-task`,
      method: 'POST',
      headers: authHeaders(token),
      body: {},
    });

    if (res.status === 200 && res.data?.task) {
      const task = res.data.task;
      // Output task description to stdout for the AI agent to consume
      console.log(task.description || task.title);
      // Write task ID to stderr so it can be captured separately
      process.stderr.write(`MULTIMO_TASK_ID=${task.id}\n`);
    } else if (res.status === 204) {
      console.log('No tasks available. Waiting for new tasks...');
      process.exit(0);
    } else {
      console.error('Error fetching task:', res.data);
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`Failed to connect to hub: ${err.message}`);
    process.exit(1);
  }
}
