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

**Skill**: Use \`specflux-api\` skill for API reference.

## Process

1. **Check for Existing PRDs**
   - Fetch via API: GET /api/projects/{projectRef}/prds
   - If found: List them and ask "Want to refine an existing PRD or create a new one?"
   - If none: Start fresh with a new PRD

2. **Interview** (ask one question at a time, conversationally):
   - What are you building? (if not already provided)
   - What problem does it solve? Who has this problem?
   - What's the simplest version that would be useful?
   - List 3-5 core features for MVP
   - Any technical constraints or preferences?

3. **Generate PRD** using this structure:

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

4. **Create PRD via API**
   \`\`\`
   POST /api/projects/{projectRef}/prds
   {"title": "{prd-name}", "description": "{brief summary}"}
   \`\`\`
   This returns the PRD with auto-generated folderPath (e.g., \`.specflux/prds/{slug}\`)

5. **Save Markdown File** to the returned folderPath:
   - Save to \`{folderPath}/prd.md\`

6. **Register Document via API**
   \`\`\`
   POST /api/projects/{projectRef}/prds/{prdRef}/documents
   {
     "fileName": "prd.md",
     "filePath": "{folderPath}/prd.md",
     "documentType": "PRD",
     "isPrimary": true
   }
   \`\`\`

7. **Suggest Epics**:
   "I've identified these potential epics from your PRD:
   1. {Epic 1}
   2. {Epic 2}
   3. {Epic 3}

   Run \`/epic {name}\` to define any of these in detail."

## Approval Flow

After generating the PRD draft:
- Ask user to review
- Options: "approve", "refine <feedback>", "expand <section>", "restart"
- On approve: Save file and register via API
- Update status: PUT /api/projects/{projectRef}/prds/{prdRef} {"status": "APPROVED"}
- Optionally offer to create GitHub PR for team review

## Adding Supporting Documents

If user provides wireframes, mockups, or other documents:
1. Save file to \`{folderPath}/{filename}\`
2. Register via API:
   \`\`\`
   POST /api/projects/{projectRef}/prds/{prdRef}/documents
   {"fileName": "{filename}", "filePath": "{path}", "documentType": "WIREFRAME"}
   \`\`\`

Document types: PRD, WIREFRAME, MOCKUP, DESIGN, OTHER
`;

export const EPIC_COMMAND_TEMPLATE = `# /epic - Define or Refine an Epic

Define an epic and create it in SpecFlux via API.

**Skill**: Use \`specflux-api\` skill for API reference.

## Usage

\`\`\`
/epic <epic-name>
\`\`\`

## Process

1. **Gather Context**
   - Read PRDs from \`.specflux/prds/\` for product context
   - Search for mentions of \`<epic-name>\` in the PRDs
   - Check existing epics via GET /api/projects/{projectRef}/epics

2. **Interview** (ask questions conversationally):
   - What are the specific user stories for this epic?
   - What are the acceptance criteria?
   - Any edge cases or error scenarios?
   - Technical approach preferences?
   - Dependencies on other epics?

3. **Create Epic via API**
   \`\`\`
   POST /api/projects/{projectRef}/epics
   {
     "title": "{Epic Name}",
     "description": "{Summary paragraph with user stories and technical approach}",
     "prdFilePath": ".specflux/prds/{prd-name}/prd.md"
   }
   \`\`\`

4. **Add Acceptance Criteria**
   For each criterion identified:
   \`\`\`
   POST /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria
   {"criteria": "{criterion text}"}
   \`\`\`

5. **Create Tasks** (after user approval)
   Ask: "I've identified these tasks. Want me to create them?"

   For each task:
   \`\`\`
   POST /api/projects/{projectRef}/tasks
   {
     "epicRef": "{epicRef}",
     "title": "{Task title}",
     "description": "{Task description}",
     "priority": "MEDIUM"
   }
   \`\`\`

6. **Add Task Dependencies**
   If tasks have dependencies:
   \`\`\`
   POST /api/projects/{projectRef}/tasks/{taskRef}/dependencies
   {"dependsOnTaskRef": "{dependsOnTaskRef}"}
   \`\`\`

7. **Add Task Acceptance Criteria**
   For each task:
   \`\`\`
   POST /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria
   {"criteria": "{criterion text}"}
   \`\`\`

## Approval Flow

- Show epic summary with acceptance criteria and suggested tasks
- Options: "approve", "refine <feedback>", "add more criteria"
- On approve: Create via API as described above
- Suggest next steps: \`/implement <epic>\` or \`/task <id>\`

## Example Session

\`\`\`
> /epic authentication

I'll help you define the "Authentication" epic.

From your product PRD, I see this relates to user login and registration.

What user stories should this epic cover?

> Users should be able to sign up, log in, and reset password

Got it. Here's what I'm planning:

**Epic: Authentication**
User authentication with email/password, including signup, login, and password reset.

**Acceptance Criteria:**
1. Users can sign up with email/password
2. Users can log in with credentials
3. Users can reset password via email
4. JWT tokens are used for session management

**Suggested Tasks:**
1. Database schema for users (priority: HIGH)
2. Signup API endpoint
3. Login API endpoint
4. Password reset flow
5. JWT middleware

Want me to create this epic and tasks in SpecFlux? (yes/no)

> yes

Creating epic via API...
Epic created: PROJ-E1

Creating tasks...
- PROJ-42: Database schema for users
- PROJ-43: Signup API endpoint
- PROJ-44: Login API endpoint
- PROJ-45: Password reset flow
- PROJ-46: JWT middleware

Adding dependencies: PROJ-43, PROJ-44, PROJ-45 depend on PROJ-42

Done! Run \`/implement authentication\` to start implementation.
\`\`\`
`;

export const IMPLEMENT_COMMAND_TEMPLATE = `# /implement - Implement an Epic

Implement an epic directly, working through acceptance criteria.

**Skill**: Use \`specflux-api\` skill for API reference.

## Usage

\`\`\`
/implement <epic-ref>
\`\`\`

Epic ref can be display key (PROJ-E1), public ID (epic_xxx), or epic title.

## Process

1. **Fetch Epic Context via API**
   \`\`\`
   GET /api/projects/{projectRef}/epics/{epicRef}
   GET /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria
   GET /api/projects/{projectRef}/tasks?epicRef={epicRef}
   \`\`\`

2. **Update Epic Status**
   \`\`\`
   PUT /api/projects/{projectRef}/epics/{epicRef}
   {"status": "IN_PROGRESS"}
   \`\`\`

3. **If Epic Has Tasks**: Work through tasks in dependency order
   - Use \`/task <taskRef>\` for each task
   - Or implement directly and update task status via API

4. **If Epic Has No Tasks**: Work through acceptance criteria directly
   - For each criterion:
     - Plan the implementation approach
     - Implement the requirement
     - Write tests to verify
     - Mark complete via API:
       \`\`\`
       PUT /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria/{id}
       {"isMet": true}
       \`\`\`

5. **On Completion**
   \`\`\`
   PUT /api/projects/{projectRef}/epics/{epicRef}
   {"status": "COMPLETED"}
   \`\`\`
   - Suggest creating a PR for review

## Recommended Skills

Depending on the epic type, activate relevant skills:
- **Backend work**: \`api-design\`, \`typescript-patterns\`, \`database-migrations\`
- **Frontend work**: \`ui-patterns\`, \`typescript-patterns\`
- **Full-stack**: All relevant skills

## Example Session

\`\`\`
> /implement authentication

Fetching epic "Authentication" from API...

**Epic: Authentication** (PROJ-E1)
Status: PLANNING

**Acceptance Criteria:**
- [ ] Users can sign up with email/password
- [ ] Users can log in with credentials
- [ ] Password reset via email
- [ ] JWT tokens for session management

**Tasks:**
- PROJ-42: Database schema for users [BACKLOG]
- PROJ-43: Signup API endpoint [BACKLOG]
- PROJ-44: Login API endpoint [BACKLOG]

Updating epic status to IN_PROGRESS...

This epic has 3 tasks. I'll work through them in order.

Starting with PROJ-42: Database schema for users...

[Implementation proceeds via /task PROJ-42]

All tasks complete!
Updating epic status to COMPLETED...

Epic complete! Ready for review.
\`\`\`
`;

export const TASK_COMMAND_TEMPLATE = `# /task - Work on a Specific Task

Work on a specific task from SpecFlux.

**Skill**: Use \`specflux-api\` skill for API reference.

## Usage

\`\`\`
/task <task-ref>
\`\`\`

Task ref can be display key (PROJ-42) or public ID (task_xxx).

## Process

1. **Fetch Task Context via API**
   \`\`\`
   GET /api/projects/{projectRef}/tasks/{taskRef}
   GET /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria
   GET /api/projects/{projectRef}/tasks/{taskRef}/dependencies
   \`\`\`

2. **Get Epic Context** (if task belongs to epic)
   \`\`\`
   GET /api/projects/{projectRef}/epics/{epicRef}
   GET /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria
   \`\`\`

3. **Update Task Status**
   \`\`\`
   PATCH /api/projects/{projectRef}/tasks/{taskRef}
   {"status": "IN_PROGRESS"}
   \`\`\`

4. **Work Through Acceptance Criteria**
   - Implement each requirement
   - Write tests as appropriate
   - Mark criteria complete via API:
     \`\`\`
     PUT /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria/{id}
     {"isMet": true}
     \`\`\`

5. **On Completion**
   - Mark task complete:
     \`\`\`
     PATCH /api/projects/{projectRef}/tasks/{taskRef}
     {"status": "COMPLETED"}
     \`\`\`
   - Create PR if appropriate
   - Write chain output for downstream tasks (in state file)

## State File

Progress is tracked in \`.specflux/task-states/task-{id}-state.md\`:

\`\`\`markdown
# Task {displayKey} State

## Progress Log
- [timestamp] Started working on task
- [timestamp] Completed criterion 1
- [timestamp] Completed criterion 2

## Chain Output
{Summary for downstream tasks - what was implemented, key decisions, files modified}
\`\`\`

## Example Session

\`\`\`
> /task PROJ-42

Fetching task PROJ-42 from API...

**Task: Database schema for users**
Epic: Authentication (PROJ-E1)
Priority: HIGH

**Acceptance Criteria:**
- [ ] User table with id, email, password_hash, created_at
- [ ] Unique constraint on email
- [ ] Index on email for login lookups

**Dependencies:** None

Updating status to IN_PROGRESS...

Starting implementation...

Creating migration file at migrations/001_users_table.sql...

[Implementation proceeds]

Marking criteria as complete via API...
All criteria complete!

Updating status to COMPLETED...

Task PROJ-42 complete. Dependent tasks are now unblocked.
\`\`\`
`;

// ============================================================================
// CLAUDE.md Template
// ============================================================================

export const CLAUDE_MD_TEMPLATE = `# CLAUDE.md

## SpecFlux Project

This project is managed by SpecFlux. Use the SpecFlux API to create and track epics, tasks, and acceptance criteria.

## Available Commands

| Command | Description |
|---------|-------------|
| \`/prd\` | Create or refine product PRD (saved to \`.specflux/prds/\`) |
| \`/epic <name>\` | Define epic and create in SpecFlux via API |
| \`/implement <epic>\` | Implement epic, working through tasks |
| \`/task <id>\` | Work on a specific task |

## Required Skill

Use the \`specflux-api\` skill when working with epics, tasks, or acceptance criteria. It provides API endpoint documentation for:
- Creating/updating epics and tasks
- Managing acceptance criteria
- Tracking task dependencies
- Updating status and progress

## File Conventions

- PRD documents: \`.specflux/prds/{name}/prd.md\`
- Task state files: \`.specflux/task-states/task-{id}-state.md\`

## API Reference

SpecFlux API at \`http://localhost:8090/api\`:
- Epics: \`/api/projects/{projectRef}/epics\`
- Tasks: \`/api/projects/{projectRef}/tasks\`
- Acceptance criteria: \`.../epics/{epicRef}/acceptance-criteria\` or \`.../tasks/{taskRef}/acceptance-criteria\`

## Workflow

1. **Create PRD**: \`/prd\` to define what you're building
2. **Define Epics**: \`/epic <name>\` creates epic + tasks via API
3. **Implement**: \`/implement <epic>\` or \`/task <id>\` for granular work
4. **Track Progress**: Update acceptance criteria and status via API
5. **Review**: Create PR when work is complete
`;
