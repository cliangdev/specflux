/**
 * Project Templates
 *
 * These templates are copied to each project's directory structure when
 * the project's localPath is configured. They provide Claude Code with
 * the slash commands needed for spec-driven development.
 */

// ============================================================================
// Slash Command Templates (.claude/commands/)
// ============================================================================

export const PRD_COMMAND_TEMPLATE = `# /prd - Create or Refine Product Specification

Help the user create or refine a product specification document.

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

4. Save to \`.specflux/prds/{prd-name}/prd.md\`
   - Create a subdirectory for each PRD to allow related documents

5. After saving, suggest potential epics:
   "I've identified these potential epics from your PRD:
   1. {Epic 1}
   2. {Epic 2}
   3. {Epic 3}

   Run \`/epic {name}\` to define any of these in detail."

## Approval Flow

After generating the PRD draft:
- Ask user to review
- Options: "approve", "refine <feedback>", "expand <section>", "restart"
- On approve: Save to \`.specflux/prds/\`
- Optionally offer to create GitHub PR for team review
`;

export const EPIC_COMMAND_TEMPLATE = `# /epic - Define or Refine an Epic

Define or refine an epic specification.

## Usage

\`\`\`
/epic <epic-name>
\`\`\`

## Process

1. Read PRDs from \`.specflux/prds/\` for context
2. Search for mentions of \`<epic-name>\` in the PRDs
3. Check if \`.specflux/epics/<epic-name>/epic.md\` exists
   - If yes: Read and offer to refine
   - If no: Start definition

4. Interview (ask questions conversationally):
   - What are the specific user stories for this epic?
   - Any edge cases or error scenarios to handle?
   - Technical approach preferences?
   - Dependencies on other epics or external systems?

5. Generate epic PRD with this structure:

\`\`\`markdown
# Epic: {Epic Name}

## Summary
{One paragraph describing the epic}

## Parent PRD
{Reference to the product PRD this epic comes from}

## User Stories
- As a {user}, I can {action} so that {benefit}
- As a {user}, I can {action} so that {benefit}

## Acceptance Criteria
- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}

## Technical Approach
{High-level approach, chosen patterns, key decisions}

## Dependencies
- Depends on: {Epic/Task IDs, external systems}
- Blocks: {Epic/Task IDs}

## Suggested Tasks
1. {Task 1} - {brief description}
2. {Task 2} - {brief description}
3. {Task 3} - {brief description}
\`\`\`

6. Save to \`.specflux/epics/<epic-name>/epic.md\`

7. Ask: "Want me to create these tasks in SpecFlux? (yes/no)"
   - If yes: Call SpecFlux API to create tasks

## Approval Flow

After generating the epic draft:
- Ask user to review
- Options: "approve", "refine <feedback>", "expand <section>"
- On approve: Save to \`.specflux/epics/\`
- Suggest next steps: \`/design <epic>\` or \`/implement <epic>\`
`;

export const IMPLEMENT_COMMAND_TEMPLATE = `# /implement - Implement an Epic

Implement an epic directly, working through acceptance criteria.

## Usage

\`\`\`
/implement <epic-name>
\`\`\`

## Process

1. Read epic from \`.specflux/epics/<epic-name>/epic.md\`
2. Read supporting docs from \`.specflux/epics/<epic-name>/docs/\` (if any)
3. Review acceptance criteria

4. For each acceptance criterion:
   - Plan the implementation approach
   - Implement the requirement
   - Write tests to verify
   - Check off the criterion when done

5. If the epic is complex:
   - Consider breaking into tasks first
   - Create tasks via SpecFlux API
   - Work through tasks one at a time

6. When all criteria complete:
   - Mark epic as done
   - Suggest creating a PR for review

## Context Injection

When implementing, the following context is available:
- Epic PRD (\`.specflux/epics/<epic-name>/epic.md\`)
- Supporting documents (API designs, wireframes, etc.)
- Parent product PRD
- Relevant skills (based on task type)

## Progress Tracking

Update progress as you work:
- Check off acceptance criteria as they're completed
- Write progress notes to epic state file
- Update SpecFlux via API for visibility in UI

## Recommended Skills

Depending on the epic type, activate relevant skills:
- **Backend work**: \`api-design\`, \`typescript-patterns\`, \`database-migrations\`
- **Frontend work**: \`ui-patterns\`, \`typescript-patterns\`
- **Full-stack**: All relevant skills

## Example Session

\`\`\`
> /implement authentication

I'll implement the "authentication" epic.

Reading epic spec...
Found 4 acceptance criteria:
- [ ] Users can sign up with email/password
- [ ] Email verification required
- [ ] Login returns JWT token
- [ ] Password reset via email

Starting with criterion 1: User signup...

[Implementation proceeds]

Criterion 1 complete.
Moving to criterion 2...
\`\`\`
`;

export const TASK_COMMAND_TEMPLATE = `# /task - Work on a Specific Task

Work on a specific task from SpecFlux.

## Usage

\`\`\`
/task <task-id>
\`\`\`

## Process

1. Read task context:
   - Task definition and acceptance criteria
   - Target repository (if specified)
   - Chain inputs from completed dependencies
   - Relevant supporting documents from parent epic

2. Change to target repository directory (if applicable)

3. Read any existing state file for progress context

4. Work through acceptance criteria:
   - Implement each requirement
   - Write tests as appropriate
   - Check off criteria as completed

5. On completion:
   - Mark task as done
   - Write chain output for downstream tasks
   - Create PR if appropriate

## Context Available

When working on a task, these are injected:
- **Task spec**: Title, description, acceptance criteria
- **Epic context**: Parent epic PRD
- **Chain inputs**: Outputs from dependency tasks
- **Supporting docs**: Relevant design docs from epic

## Chain Outputs

When completing a task that has dependents:

Write a chain output summarizing:
- What was implemented
- Key decisions made
- API endpoints created (if any)
- Files modified
- Any relevant context for downstream tasks

## State File

Progress is tracked in \`.specflux/task-states/task-{id}-state.md\`:

\`\`\`markdown
# Task {id} State

## Progress Log
- [timestamp] Started working on task
- [timestamp] Completed criterion 1
- [timestamp] Completed criterion 2

## Chain Inputs Received
{Context from dependency tasks}

## Chain Output
{Summary for downstream tasks}
\`\`\`

## Example Session

\`\`\`
> /task 101

Reading task #101: "Database schema for readings"

Context:
- Epic: Quick Reading Log
- Dependencies: None
- Acceptance criteria:
  - [ ] Create readings table
  - [ ] Add indexes for user queries
  - [ ] Create migration file

Starting implementation...

Creating migration file at migrations/001_readings_table.sql...

[Implementation proceeds]

All criteria complete!
Writing chain output for dependent tasks...

Task #101 complete. Tasks #102 and #104 are now unblocked.
\`\`\`
`;

// ============================================================================
// CLAUDE.md Template
// ============================================================================

export const CLAUDE_MD_TEMPLATE = `# CLAUDE.md

## SpecFlux Project

This project is managed by SpecFlux. Specs and state are stored in \`.specflux/\`.

## Available Commands

| Command | Description |
|---------|-------------|
| \`/prd\` | Create or refine product PRD |
| \`/epic <name>\` | Define or refine an epic |
| \`/implement <epic>\` | Implement epic directly (creates tasks as needed) |
| \`/task <id>\` | Work on a specific task |

## File Conventions

- PRD documents: \`.specflux/prds/{name}/prd.md\`
- Epic PRDs: \`.specflux/epics/{name}/epic.md\`
- Supporting docs: \`.specflux/epics/{name}/docs/*\`
- Task states: \`.specflux/task-states/task-{id}-state.md\`

## When Working on Tasks

1. Read task context (acceptance criteria, dependencies, supporting docs)
2. Read state file for progress context
3. Implement directly (don't just suggest)
4. Check off acceptance criteria as completed
5. Update progress log in state file
6. Write chain output for downstream tasks when done

## Workflow

The typical workflow is:

1. **Create PRD**: \`/prd\` to define what you're building
2. **Define Epics**: \`/epic <name>\` to break PRD into epics
3. **Implement**: Either \`/implement <epic>\` or \`/task <id>\` for granular work
4. **Review**: Create PR when work is complete
`;
