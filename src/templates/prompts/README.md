# Agent Context Prompts

These prompts are injected when the "Launch Agent" button is clicked, based on the current page context.

## Usage

When launching an agent session, inject the appropriate prompt with context data:

```typescript
import prdPrompt from './prd-context.md?raw';
import epicPrompt from './epic-context.md?raw';
import taskPrompt from './task-context.md?raw';
import projectPrompt from './project-context.md?raw';

function getAgentPrompt(contextType: string, data: Record<string, string>): string {
  let template: string;

  switch (contextType) {
    case 'prd':
      template = prdPrompt;
      break;
    case 'epic':
      template = epicPrompt;
      break;
    case 'task':
      template = taskPrompt;
      break;
    default:
      template = projectPrompt;
  }

  // Replace {{placeholders}} with actual data
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}
```

## Template Variables

### PRD Context
- `{{title}}` - PRD title
- `{{displayKey}}` - Display key (e.g., "SPEC-P1")
- `{{status}}` - PRD status (DRAFT, IN_REVIEW, APPROVED)
- `{{documentCount}}` - Number of attached documents

### Epic Context
- `{{title}}` - Epic title
- `{{displayKey}}` - Display key (e.g., "SPEC-E1")
- `{{status}}` - Epic status
- `{{taskCount}}` - Number of tasks
- `{{prdDisplayKey}}` - Parent PRD display key (if linked)

### Task Context
- `{{title}}` - Task title
- `{{displayKey}}` - Display key (e.g., "SPEC-42")
- `{{status}}` - Task status
- `{{priority}}` - Task priority
- `{{epicDisplayKey}}` - Parent epic display key

### Project Context
- `{{name}}` - Project name
- `{{projectKey}}` - Project key (e.g., "SPEC")

## Injection Point

Inject the prompt when opening the terminal session, before the user types anything. The agent will read the prompt and offer context-appropriate options.
