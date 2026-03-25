import fs from 'fs';
import path from 'path';

const templates: Record<string, { filename: string; content: string }> = {
  claude: {
    filename: 'CLAUDE.md',
    content: `## MultiMO — Remote Task Queue

This project is connected to MultiMO. The user controls you remotely from their phone.

### IMPORTANT: After finishing ANY task, always do this:
1. Run: \`multimo-agent done "brief summary of what you did"\`
2. Run: \`multimo-agent next\`
3. Read the output — it contains your next task
4. Execute that task fully
5. Go back to step 1

### If you need to ask the user something:
Run: \`multimo-agent ask "your question here"\`
Wait for the output — it will contain the user's answer. Then continue working.

### Commands reference:
- \`multimo-agent next\` — Get next task (prints task description to stdout)
- \`multimo-agent done "what you did"\` — Report completion
- \`multimo-agent ask "question"\` — Ask user and wait for answer
- \`multimo-agent status\` — Check connection status

### Start working:
Run \`multimo-agent next\` now to get your first task. If there is no task yet, tell the user you are ready and waiting.
`,
  },
  cursor: {
    filename: '.cursorrules',
    content: `# MultiMO Task Queue Integration

When you finish your current task and don't know what to do next:
1. Run the shell command: npx @multimo/agent done "<summary of what you did>"
2. Run the shell command: npx @multimo/agent next
3. The output will be your next task - continue working on it

If you need to ask the user a question:
- Run: npx @multimo/agent ask "<your question>"
- Wait for the answer in the output

Always report completion before requesting the next task.
`,
  },
  codex: {
    filename: 'AGENTS.md',
    content: `# MultiMO Task Queue Integration

This repository uses MultiMO for task coordination.

## Getting Next Task
\`\`\`bash
npx @multimo/agent next
\`\`\`

## Reporting Completion
\`\`\`bash
npx @multimo/agent done "Description of what was completed"
\`\`\`

## Asking a Question
\`\`\`bash
npx @multimo/agent ask "Your question here"
\`\`\`

## Workflow
1. Complete your current task
2. Report completion with \`done\`
3. Request next task with \`next\`
4. Work on the received task
5. Repeat
`,
  },
  generic: {
    filename: 'MULTIMO.md',
    content: `# MultiMO Task Queue

Commands available:
- \`npx @multimo/agent next\` - Get next task
- \`npx @multimo/agent done "summary"\` - Report task completion
- \`npx @multimo/agent ask "question"\` - Ask user a question (waits for answer)
- \`npx @multimo/agent status\` - Check agent status

Workflow: done → next → work → done → next → ...
`,
  },
};

export function initCommand(type: string): void {
  const template = templates[type] || templates.generic;
  const targetPath = path.join(process.cwd(), template.filename);

  if (fs.existsSync(targetPath)) {
    console.log(`File ${template.filename} already exists. Skipping.`);
  } else {
    fs.writeFileSync(targetPath, template.content);
    console.log(`Created ${template.filename} with MultiMO instructions for ${type} agents.`);
  }

  // Add .multimo/ to .gitignore if not already there
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    if (!content.includes('.multimo')) {
      fs.appendFileSync(gitignorePath, '\n# MultiMO agent config (per-repo)\n.multimo/\n');
      console.log('Added .multimo/ to .gitignore');
    }
  } else {
    fs.writeFileSync(gitignorePath, '# MultiMO agent config (per-repo)\n.multimo/\n');
    console.log('Created .gitignore with .multimo/');
  }
}
