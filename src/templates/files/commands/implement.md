# /implement - Implement Features

Implement a release, PRD, epic, or task based on the current context.

**Skill**: Use `specflux-api` skill for API reference.

## Context from Environment

The terminal session provides context via environment variables:
- `SPECFLUX_PROJECT_REF` - Project reference for API calls (e.g., "SPEC")
- `SPECFLUX_CONTEXT_TYPE` - Current context type: `release`, `prd`, `prd-workshop`, `epic`, or `task`
- `SPECFLUX_CONTEXT_REF` - Context reference for API calls (e.g., "SPEC-E1", "SPEC-P1", "SPEC-42")

Use these to automatically determine what you're implementing.

## Usage

```
/implement [ref]
```

- Without argument: Uses current context from environment
- With argument: Implements specific ref (epic key, task key, PRD key, or release key)

## Phase 1: Understand Context (Skip if Already Known)

**IMPORTANT**: Skip this phase if you already have context from the current session. For example:
- You just finished `/prd` and `/epic` in the same conversation
- You already read the PRD documents earlier
- The user explicitly says to proceed with implementation

Only run Phase 1 if:
- Starting a fresh session with `/implement`
- Context is unclear or incomplete
- Working on a different epic/task than previously discussed

### 1.1 Detect Implementation Scope

Based on `SPECFLUX_CONTEXT_TYPE` or provided ref:

| Context Type | Implementation Scope |
|--------------|---------------------|
| `release` | All epics in the release |
| `prd` / `prd-workshop` | All epics linked to the PRD |
| `epic` | The epic and its tasks |
| `task` | Single task only |

### 1.2 Fetch Full Context via API

**For Release:**
```bash
GET /api/projects/{projectRef}/releases/{releaseRef}
GET /api/projects/{projectRef}/epics?releaseRef={releaseRef}
```

**For PRD:**
```bash
GET /api/projects/{projectRef}/prds/{prdRef}
GET /api/projects/{projectRef}/prds/{prdRef}/documents
GET /api/projects/{projectRef}/epics?prdRef={prdRef}
```

**For Epic:**
```bash
GET /api/projects/{projectRef}/epics/{epicRef}
GET /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria
GET /api/projects/{projectRef}/tasks?epicRef={epicRef}
# If epic has prdId, also fetch PRD documents
GET /api/projects/{projectRef}/prds/{prdRef}/documents
```

**For Task:**
```bash
GET /api/projects/{projectRef}/tasks/{taskRef}
GET /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria
# Get parent epic context
GET /api/projects/{projectRef}/epics/{epicRef}
```

### 1.3 Read All Documents

**IMPORTANT**: Before any implementation, read ALL associated documents:

1. **PRD documents** - Primary requirements document
2. **Wireframes** - UI structure and layout
3. **Mockups** - Visual design references
4. **Design docs** - Technical specifications

```bash
# Get document list
GET /api/projects/{projectRef}/prds/{prdRef}/documents

# Read each document file from the local path
# Documents are stored at: {project.localPath}/{document.filePath}
```

### 1.4 Understand Current State

Check what's already implemented:
- Review existing code related to the feature
- Check task/epic statuses to understand progress
- Identify completed vs pending acceptance criteria

```bash
GET /api/projects/{projectRef}/tasks?epicRef={epicRef}
GET /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria
GET /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria
```

## Phase 2: Plan Implementation

### 2.1 Create Implementation Plan

Based on gathered context:
1. List all tasks in dependency order
2. Map acceptance criteria to implementation steps and corresponding tests
3. Note any blockers or dependencies

### 2.2 Create Fresh Branch from Main

**CRITICAL**: Always start implementation on a fresh branch from the latest main.

```bash
# Ensure we're on main and up to date
git checkout main
git pull origin main

# Create feature branch based on context type
git checkout -b <branch-name>
```

**Branch naming convention:**
| Context Type | Branch Name Pattern |
|--------------|---------------------|
| `prd` | `feature/prd-<prd-ref>` (e.g., `feature/prd-SPEC-P1`) |
| `epic` | `feature/epic-<epic-ref>` (e.g., `feature/epic-SPEC-E5`) |
| `task` | `fix/<task-ref>` or `feature/<task-ref>` (e.g., `fix/SPEC-42`) |

### 2.3 Update Epic Status to IN_PROGRESS

```bash
# For epic
PUT /api/projects/{projectRef}/epics/{epicRef}
{"status": "IN_PROGRESS"}

# For PRD (if implementing full PRD)
PUT /api/projects/{projectRef}/prds/{prdRef}
{"status": "IN_REVIEW"}
```

## Phase 3: Implement Tasks

Work through tasks in dependency order. **Each task = one git commit.**

### 3.0 Consider Using Sub-Agents and Skills

**For complex tasks**, delegate to specialized sub-agents for better results:

| Task Complexity | Approach |
|-----------------|----------|
| Simple (1-2 files, clear changes) | Implement directly |
| Medium (3-5 files, single domain) | Use appropriate skill |
| Complex (multi-file, cross-cutting) | Spawn specialized sub-agent |

**Available sub-agents:**
- `backend-dev` - Spring Boot APIs, database, backend logic
- `frontend-dev` - React components, UI, Tauri integration
- `fullstack-dev` - End-to-end features spanning both layers

**When to spawn a sub-agent:**
- Task involves significant code in one domain (e.g., "implement user settings API")
- Multiple related files need coordinated changes
- Task benefits from domain expertise

**Example - spawning for a backend task:**
```
Use Task tool with subagent_type="backend-dev":
"Implement SPEC-55: Profile data model.
Create migration, repository, and service layer.
Acceptance criteria: [list criteria]
Write tests for each criterion."
```

**Always activate relevant skills** before implementation:
- Backend work: `springboot-patterns`, `database-migrations`, `api-design`
- Frontend work: `ui-patterns`, `typescript-patterns`, `tauri-dev`
- API changes: `api-spec-update`

### 3.1 Start Task - Update Status to IN_PROGRESS

**IMMEDIATELY** when starting work on a task:

```bash
PATCH /api/projects/{projectRef}/tasks/{taskRef}
{"status": "IN_PROGRESS"}
```

This signals to the user (and the Kanban board) that work has begun.

### 3.2 Read Task Acceptance Criteria

```bash
GET /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria
```

### 3.3 Implement with Tests

1. **Implement the feature**
   - Write clean, well-structured code
   - Follow project conventions and patterns
   - Reference PRD/wireframes for requirements

2. **Write tests for each acceptance criterion**
   - **IMPORTANT**: Each acceptance criterion should have at least one corresponding test
   - Unit tests for business logic criteria
   - Integration tests for API/data flow criteria
   - Component tests for UI behavior criteria
   - Name tests clearly to map back to criteria (e.g., `should display error when field is empty`)

3. **Verify acceptance criteria are covered**
   - Run tests to confirm functionality
   - Ensure test coverage maps to acceptance criteria
   - Check each criterion is satisfied by code AND tests

### 3.4 Complete Task - Mark Criteria and Commit

```bash
# Mark each criterion as met
PUT /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria/{id}
{"isMet": true}

# Update task status to COMPLETED
PATCH /api/projects/{projectRef}/tasks/{taskRef}
{"status": "COMPLETED"}
```

**Git commit for the task:**

Keep commit messages **simple and descriptive** - focus on what was done so future agents can understand the work:

```bash
git add .
git commit -m "<task-ref>: <brief description of what was implemented>

<optional 1-2 lines of context if needed>"
```

**Examples of good commit messages:**
- `SPEC-42: add user profile form with validation`
- `SPEC-43: implement profile API endpoints and tests`
- `SPEC-44: add profile avatar upload with S3 integration`

**Avoid:**
- Long lists of acceptance criteria in commits
- Verbose boilerplate text
- Implementation details better captured in code comments

### 3.5 Handle Blocked Tasks

If a task cannot be completed:

```bash
# Mark as blocked with reason
PATCH /api/projects/{projectRef}/tasks/{taskRef}
{"status": "BLOCKED"}
```

Inform the user of the blocker and move to the next task if possible.

### 3.6 Repeat for All Tasks

Continue until all tasks in the epic are complete.

## Phase 4: Verify Epic Completion

### 4.1 Verify ALL Acceptance Criteria

```bash
# Get epic-level criteria
GET /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria

# Get all task criteria
GET /api/projects/{projectRef}/tasks?epicRef={epicRef}
# For each task:
GET /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria
```

**Checklist:**
- [ ] All task acceptance criteria are met
- [ ] All epic acceptance criteria are met
- [ ] Tests pass for all critical components
- [ ] Code follows project standards
- [ ] No regressions introduced

### 4.2 Mark Epic Complete

```bash
# Mark epic acceptance criteria
PUT /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria/{id}
{"isMet": true}

# Update epic status
PUT /api/projects/{projectRef}/epics/{epicRef}
{"status": "COMPLETED"}
```

### 4.3 Update PRD Status (if applicable)

If all epics for a PRD are complete:
```bash
PUT /api/projects/{projectRef}/prds/{prdRef}
{"status": "APPROVED"}
```

## Phase 5: Finalize

1. **Run full test suite** to ensure no regressions
2. **Create PR** with summary of all changes
3. **Update release** status if applicable

## Recommended Skills

Activate relevant skills based on implementation type:
- **Backend**: `springboot-patterns`, `api-design`, `database-migrations`
- **Frontend**: `ui-patterns`, `typescript-patterns`, `tauri-dev`
- **Full-stack**: All relevant skills

## Quick Reference: Task Status Flow

```
BACKLOG → IN_PROGRESS → COMPLETED
              ↓
           BLOCKED (if stuck)
```

**Always update status via API** so the Kanban board reflects real-time progress.

## Example Session

```
> /implement SPEC-E5

[Context already known from /prd and /epic - skipping Phase 1]

🚀 Starting implementation of Epic SPEC-E5...

→ Creating fresh branch from main...
  git checkout main && git pull origin main
  git checkout -b feature/epic-SPEC-E5

→ Updating epic status to IN_PROGRESS...

═══════════════════════════════════════
📦 Task SPEC-55: Profile data model
═══════════════════════════════════════

→ Updating task status to IN_PROGRESS...

**Acceptance Criteria:**
- [ ] User profile table with avatar_url, bio, preferences
- [ ] Migration script with rollback support
- [ ] Repository with CRUD operations

[Implementation...]
[Writing tests for each criterion...]
[Verifying criteria...]

✅ All criteria verified. Creating commit...

git commit -m "SPEC-55: add profile data model with migration and repository"

→ Marking criteria as met via API...
→ Updating task status to COMPLETED...

═══════════════════════════════════════
📦 Task SPEC-56: Profile API endpoints
═══════════════════════════════════════

→ Updating task status to IN_PROGRESS...

[...continues for each task, one commit per task...]

═══════════════════════════════════════
✅ Epic SPEC-E5 Complete!
═══════════════════════════════════════

**Verification:**
- [x] All 3 tasks completed (3 commits)
- [x] All task criteria met (9/9)
- [x] All epic criteria met (4/4)
- [x] Tests passing (each criterion has corresponding test)

→ Updating epic status to COMPLETED...

Ready for PR creation!
```
