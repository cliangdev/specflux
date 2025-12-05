/**
 * Template strings for .claude directory initialization
 * These templates are written to new projects to enable Claude Code integration
 */

/**
 * Generate CLAUDE.md content for a project
 */
export function getClaudeMdTemplate(projectName: string): string {
  return `# ${projectName} - Claude Code Guide

This project is managed by SpecFlux. Specs and state are stored in \`.specflux/\`.

## Available Commands

| Command | Description |
|---------|-------------|
| \`/prd\` | Create or refine product PRD |
| \`/epic <name>\` | Define or refine an epic |
| \`/design <epic>\` | Create supporting document for epic |
| \`/implement <epic>\` | Implement epic directly (creates tasks as needed) |
| \`/task <id>\` | Work on a specific task |

## File Conventions

- PRD documents: \`.specflux/prds/*.md\`
- Epic PRDs: \`.specflux/epics/{name}/epic.md\`
- Supporting docs: \`.specflux/epics/{name}/docs/*\`
- Task states: \`.specflux/task-states/task-{id}-state.md\`

## When Working on Tasks

1. Read task from SpecFlux API: \`GET /api/tasks/{id}\`
2. Read state file for progress context
3. Implement directly (don't just suggest)
4. Check off acceptance criteria via API
5. Update progress log in state file
`;
}

/**
 * Generate .mcp.json content for MCP server configuration
 */
export function getMcpJsonTemplate(): string {
  return `{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "\${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
`;
}

/**
 * Generate /prd command template
 */
export function getPrdCommandTemplate(): string {
  return `# Create or Refine Product PRD

Help the user create a structured product specification.

## Process

1. Check if \`.specflux/prds/\` has existing PRDs
   - If yes: List them and ask "Want to refine an existing PRD or create a new one?"
   - If no: Start fresh with a new PRD

2. Interview (ask one question at a time, conversationally):
   - What are you building? (if not already provided)
   - What problem does it solve? Who has this problem?
   - What's the simplest version that would be useful?
   - List 3-5 core features for MVP
   - Any technical constraints or preferences?

3. Generate PRD using this structure:

\`\`\`markdown
# {Project Name}

## Problem Statement
{Why does this need to exist? Who has this problem?}

## Target Users
- Primary: {who}
- Secondary: {who}

## Core Features (MVP)
1. {Feature 1} - {brief description}
2. {Feature 2} - {brief description}
3. {Feature 3} - {brief description}

## Out of Scope (for now)
- {Feature that's explicitly not in MVP}

## Technical Constraints
- {Platform, language, integration requirements}

## Success Metrics
- {How do we know this is working?}
\`\`\`

4. Save to \`.specflux/prds/{prd-name}.md\`

5. After saving, suggest:
   "I've identified these potential epics from your PRD:
   1. {Epic 1}
   2. {Epic 2}
   3. {Epic 3}

   Run \`/epic {name}\` to define any of these in detail."
`;
}

/**
 * Generate /epic command template
 */
export function getEpicCommandTemplate(): string {
  return `# Define or Refine Epic

Define an epic specification from product PRD.

## Usage
/epic <epic-name>

## Process

1. Read PRDs from \`.specflux/prds/\` for context
2. Search for <epic-name> mentions in the PRDs
3. Check if \`.specflux/epics/<epic-name>/epic.md\` exists
   - If yes: Read and offer to refine
   - If no: Start definition

4. Interview:
   - What are the specific user stories for this epic?
   - Any edge cases or error scenarios to handle?
   - Technical approach preferences?
   - Dependencies on other epics or external systems?

5. Generate epic PRD with:

\`\`\`markdown
# Epic: {Epic Name}

## Summary
{One paragraph describing the epic}

## Parent PRD Context
> {Relevant excerpt from product PRD}

## User Stories
- As a {user}, I can {action} so that {benefit}
- ...

## Acceptance Criteria
- [ ] {Criterion 1}
- [ ] {Criterion 2}
- ...

## Technical Approach
{High-level approach, chosen patterns}

## Dependencies
- Depends on: {Epic/Task IDs}
- Blocks: {Epic/Task IDs}

## Suggested Tasks
1. {Task 1}
2. {Task 2}
...
\`\`\`

6. Save to \`.specflux/epics/<epic-name>/epic.md\`

7. Ask: "Want me to create these tasks in SpecFlux? (yes/no)"
   - If yes: Call SpecFlux API to create tasks
`;
}

/**
 * Generate /design command template
 */
export function getDesignCommandTemplate(): string {
  return `# Create Design Document for Epic

Create a supporting design document (API spec, schema, wireframes, etc.).

## Usage
/design <epic-name>

## Process

1. Read \`.specflux/epics/<epic-name>/epic.md\` for context

2. Ask what type of document to create:
   - API Design (REST endpoints, request/response schemas)
   - Database Schema (tables, relationships, migrations)
   - Architecture (system diagrams, component interactions)
   - UI Wireframes (page layouts, user flows)
   - Other (custom document type)

3. Generate the document based on epic context and type

4. Save to \`.specflux/epics/<epic-name>/docs/<name>.md\`

5. Register with SpecFlux API (add tags for context injection):
   - \`api-design\` - Injected for backend tasks
   - \`database\` - Injected for database tasks
   - \`wireframe\` - Injected for frontend tasks
   - \`architecture\` - Injected for all tasks
`;
}

/**
 * Generate /implement command template
 */
export function getImplementCommandTemplate(): string {
  return `# Implement Epic Directly

Implement an epic, working through all acceptance criteria.

## Usage
/implement <epic-name>

## Process

1. Read epic from SpecFlux API: GET /epics/:id
   - Get acceptance criteria
   - Get target repository path
   - Get supporting documents

2. Read supporting docs from \`.specflux/epics/<name>/docs/\`

3. Review acceptance criteria with user

4. For each criterion:
   - Implement the requirement
   - Test it works
   - Check off via API: PUT /epics/:id/criteria/:cid
   - Update progress in SpecFlux

5. If epic is complex, suggest breaking into tasks:
   - Create tasks via API
   - Switch to task-level work with \`/task <id>\`

6. When all criteria done:
   - Mark epic complete via API
   - Summarize what was built

## Tips

- Work incrementally, checking off criteria as you go
- Commit after each logical piece of work
- Write tests alongside implementation
- Ask for clarification rather than assuming
`;
}

/**
 * Generate /task command template
 */
export function getTaskCommandTemplate(): string {
  return `# Work on Specific Task

Execute a specific task with full context injection.

## Usage
/task <task-id>

## Process

1. Read task context from SpecFlux API: GET /tasks/:id/context
   - Task definition + acceptance criteria
   - Target repo path (cd to it)
   - Chain inputs from completed dependencies
   - Relevant supporting docs

2. Change to target repo directory

3. Read state file for progress context:
   \`.specflux/task-states/task-{id}-state.md\`

4. Review acceptance criteria and plan approach

5. Work through acceptance criteria:
   - Implement each requirement
   - Test it works
   - Check off via API as completed
   - Update progress log in state file

6. When done:
   - Write chain output summary for downstream tasks
   - Mark task complete via API
   - Suggest next task if dependencies are unblocked

## State File Format

The state file tracks progress and context:

\`\`\`markdown
# Task State: {task-id}

## Progress Log
- {timestamp}: Started task
- {timestamp}: Completed criterion 1
- ...

## Chain Inputs (from dependencies)
{Summary from upstream tasks}

## Chain Output (for downstream)
{Summary of what was built, key decisions, files changed}
\`\`\`

## Tips

- Read chain inputs carefully for context from dependencies
- Write clear chain outputs for downstream tasks
- Commit frequently with descriptive messages
- Update state file as you make progress
`;
}
