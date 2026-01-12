# /specflux:implement - Implementation Entry Point

Start implementation work on epics or tasks. Loads context and kicks off the coding workflow.

**Skills**: Use `specflux-api` for API operations. The `specflux-coding` skill automatically activates to guide the implementation workflow.

## Context from Environment

The terminal session provides context via environment variables:
- `SPECFLUX_PROJECT_REF` - Project reference for API calls (e.g., "SPEC")
- `SPECFLUX_CONTEXT_TYPE` - Current context type: `epic` or `task`
- `SPECFLUX_CONTEXT_REF` - Context reference (e.g., "SPEC-E1", "SPEC-42")
- `SPECFLUX_CONTEXT_ID` - Entity ID

## Usage

```
/specflux:implement [ref...]
```

- Without argument: Uses current context from environment
- With argument(s): Implements specific ref(s) - can be multiple epics or tasks
- Multiple items in one session share a single branch and PR

## Process

### 1. Detect Scope

Based on `SPECFLUX_CONTEXT_TYPE` or provided refs:

| Input | Scope |
|-------|-------|
| Single epic ref | All tasks in that epic |
| Multiple epic refs | All tasks across all epics |
| Single task ref | Single task |
| Multiple task refs | Multiple tasks |
| Mixed refs | All specified items |

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
| Scope | Pattern |
|-------|---------|
| Single epic | `feature/<epic-ref>` |
| Multiple epics | `feature/<first-epic-ref>-and-more` |
| Single task | `fix/<task-ref>` or `feature/<task-ref>` |
| Multiple tasks | `feature/<first-task-ref>-batch` |

**Note:** One branch per implementation session, regardless of how many items are being implemented.

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
/specflux:implement SPEC-E5 SPEC-E6
    │
    ├─► Fetch all epics + tasks + PRD documents
    │
    ├─► Create single branch: feature/SPEC-E5-and-more
    │
    ├─► For each epic:
    │   ├─► Update epic status: IN_PROGRESS
    │   │
    │   └─► For each task (specflux-coding skill):
    │       ├─► Update task status: IN_PROGRESS
    │       ├─► Read acceptance criteria
    │       ├─► Write tests for each criterion
    │       ├─► Implement until all tests pass
    │       ├─► Mark criteria as met via API
    │       ├─► Commit: "SPEC-XX: brief description"
    │       └─► Update task status: COMPLETED
    │   │
    │   └─► All tasks done → Mark epic COMPLETED
    │
    └─► ALL epics complete → Suggest PR
```

**Important:** PR is only suggested after ALL work items in the session are complete.

---

## Sub-Agent Delegation

For complex tasks, delegate to specialized sub-agents if available in the project.

**Check for available agents:**
```bash
ls .claude/agents/
```

Match task requirements to available agents based on their descriptions. If no specialized agent exists for a task type, handle the implementation directly.

**IMPORTANT:** All sub-agents MUST follow the `specflux-coding` workflow:
- Tests first (turn acceptance criteria into tests)
- Implement until tests pass
- One commit per task

When spawning sub-agents, provide:
- Task reference and acceptance criteria
- Instruction to follow `specflux-coding` skill
- Relevant file paths and context

---

## Example Session

```
> /specflux:implement SPEC-E5 SPEC-E6

Reading epics...
- SPEC-E5: "User Profile"
- SPEC-E6: "User Settings"

Reference Documents:
- .specflux/prds/user-management/prd.md
- .specflux/prds/user-management/wireframes.md

Tasks in scope:
Epic SPEC-E5:
  1. SPEC-55: Profile data model
  2. SPEC-56: Profile API endpoints
  3. SPEC-57: Profile UI components
Epic SPEC-E6:
  4. SPEC-58: Settings data model
  5. SPEC-59: Settings API endpoints

Creating branch: feature/SPEC-E5-and-more

═══════════════════════════════════════
Epic SPEC-E5: User Profile → IN_PROGRESS
═══════════════════════════════════════

📦 Task SPEC-55: Profile data model

Acceptance Criteria:
1. User profile table with avatar_url, bio, preferences
2. Migration script with rollback support
3. Repository with CRUD operations

Writing tests for each criterion...
Implementing until all tests pass...
✅ All tests passing.

Committing: "SPEC-55: add profile data model with migration and repository"
Status: COMPLETED

📦 Task SPEC-56: Profile API endpoints
[...continues...]

📦 Task SPEC-57: Profile UI components
[...continues...]

✅ Epic SPEC-E5 Complete!

═══════════════════════════════════════
Epic SPEC-E6: User Settings → IN_PROGRESS
═══════════════════════════════════════

📦 Task SPEC-58: Settings data model
[...continues...]

📦 Task SPEC-59: Settings API endpoints
[...continues...]

✅ Epic SPEC-E6 Complete!

═══════════════════════════════════════
✅ All Work Items Complete!
═══════════════════════════════════════

Epics completed: SPEC-E5, SPEC-E6
Total tasks: 5
Total commits: 5

Ready for PR creation!
```
