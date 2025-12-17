# Agent Context Prompts

These prompts are automatically injected when the "Launch Agent" button is clicked from PRD, Epic, or Task detail pages.

## How It Works

1. User clicks "Launch Agent" on a detail page
2. A context-specific prompt is generated with current entity data
3. Terminal opens and starts Claude
4. After Claude starts (~8 seconds), the prompt is sent automatically
5. Claude responds with context-appropriate options

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

### Task Context
- `{{title}}` - Task title
- `{{displayKey}}` - Display key (e.g., "SPEC-T1")
- `{{status}}` - Task status
- `{{priority}}` - Task priority

### Project Context
- `{{name}}` - Project name
- `{{projectKey}}` - Project key (e.g., "SPEC")

## Files

- `prd-context.md` - Prompt for PRD pages
- `epic-context.md` - Prompt for Epic pages
- `task-context.md` - Prompt for Task pages
- `project-context.md` - Prompt for Project pages

## Implementation

The prompt generation is handled by `src/services/promptGenerator.ts`. Templates are imported as raw strings and variables are replaced at runtime.
