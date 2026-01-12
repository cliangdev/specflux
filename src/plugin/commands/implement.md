# /specflux:implement - Implementation Entry Point

Start implementation work on an epic or task. Loads context and kicks off the coding workflow.

**Skills**: Use `specflux-api` for API operations. The `specflux-coding` skill automatically activates to guide the implementation workflow.

## Context from Environment

The terminal session provides context via environment variables:
- `SPECFLUX_PROJECT_REF` - Project reference for API calls (e.g., "SPEC")
- `SPECFLUX_CONTEXT_TYPE` - Current context type: `epic` or `task`
- `SPECFLUX_CONTEXT_REF` - Context reference (e.g., "SPEC-E1", "SPEC-42")
- `SPECFLUX_CONTEXT_ID` - Entity ID

## Usage

```
/specflux:implement [ref]
```

- Without argument: Uses current context from environment
- With argument: Implements specific ref (epic or task key)

## Process

### 1. Detect Scope

Based on `SPECFLUX_CONTEXT_TYPE` or provided ref:

| Context | Scope |
|---------|-------|
| `epic` | All tasks in the epic |
| `task` | Single task |

### 2. Fetch Context

**For Epic:**
```bash
GET /api/projects/{projectRef}/epics/{epicRef}
GET /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria
GET /api/projects/{projectRef}/tasks?epicRef={epicRef}

# If epic has prdId, fetch PRD documents for reference
GET /api/projects/{projectRef}/prds/{prdRef}/documents
```

**For Task:**
```bash
GET /api/projects/{projectRef}/tasks/{taskRef}
GET /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria

# Get parent epic context
GET /api/projects/{projectRef}/epics/{epicRef}
```

### 3. Read All Reference Documents

Read ALL associated documents from the file system:
- PRD documents
- Wireframes
- Mockups
- Design docs
- Architecture diagrams

### 4. Create Implementation Plan

1. List all tasks in dependency order
2. For each task, list its acceptance criteria
3. Note any blockers or dependencies

### 5. Create Fresh Branch

```bash
git checkout main
git pull origin main
git checkout -b <branch-name>
```

**Branch naming:**
| Context | Pattern |
|---------|---------|
| `epic` | `feature/epic-<epic-ref>` |
| `task` | `fix/<task-ref>` or `feature/<task-ref>` |

### 6. Update Status

```bash
# For epic
PUT /api/projects/{projectRef}/epics/{epicRef}
{"status": "IN_PROGRESS"}
```

### 7. Hand Off to Coding Workflow

At this point, the `specflux-coding` skill takes over. The skill ensures:

1. **Tests first** - Turn acceptance criteria into tests
2. **Implement** - Write code until all tests pass
3. **One commit per task** - When all criteria pass, commit
4. **Update API** - Mark criteria as met

The skill is always active when coding, so you just proceed with implementation following its workflow.

---

## Implementation Flow Summary

```
/specflux:implement SPEC-E5
    │
    ├─► Fetch epic + tasks + documents
    │
    ├─► Create branch: feature/epic-SPEC-E5
    │
    ├─► Update epic status: IN_PROGRESS
    │
    └─► For each task (specflux-coding skill):
        ├─► Update task status: IN_PROGRESS
        ├─► Read acceptance criteria
        ├─► Write tests for each criterion
        ├─► Implement until all tests pass
        ├─► Mark criteria as met via API
        ├─► Commit: "SPEC-XX: brief description"
        └─► Update task status: COMPLETED
    │
    └─► All tasks done → Mark epic COMPLETED → Suggest PR
```

---

## Sub-Agent Delegation

For complex tasks, delegate to specialized sub-agents:

| Task Type | Sub-Agent |
|-----------|-----------|
| Backend API, database | `backend-dev` |
| React components, UI | `frontend-dev` |
| End-to-end features | `fullstack-dev` |

When spawning sub-agents, provide:
- Task reference
- Acceptance criteria
- Relevant file paths

---

## Example Session

```
> /specflux:implement SPEC-E5

Reading epic SPEC-E5: "User Profile"...

Reference Documents:
- .specflux/prds/user-management/prd.md
- .specflux/prds/user-management/wireframes.md

Tasks in scope:
1. SPEC-55: Profile data model
2. SPEC-56: Profile API endpoints
3. SPEC-57: Profile UI components

Creating branch: feature/epic-SPEC-E5
Updating epic status to IN_PROGRESS...

═══════════════════════════════════════
📦 Task SPEC-55: Profile data model
═══════════════════════════════════════

Status: IN_PROGRESS

Acceptance Criteria:
1. User profile table with avatar_url, bio, preferences
2. Migration script with rollback support
3. Repository with CRUD operations

Writing tests for each criterion...
[Tests created]

Implementing until all tests pass...
[Implementation in progress]

✅ All tests passing.

Marking criteria as met...
Committing: "SPEC-55: add profile data model with migration and repository"
Status: COMPLETED

═══════════════════════════════════════
📦 Task SPEC-56: Profile API endpoints
═══════════════════════════════════════

[...continues for each task...]

═══════════════════════════════════════
✅ Epic SPEC-E5 Complete!
═══════════════════════════════════════

All 3 tasks completed.
Ready for PR creation!
```
