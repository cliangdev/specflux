# /task - Work on a Specific Task

Work on a specific task from SpecFlux.

**Skill**: Use `specflux-api` skill for API reference.

## Context from Environment

The terminal session provides context via environment variables:
- `SPECFLUX_PROJECT_REF` - Project reference for API calls (e.g., "SPEC")
- `SPECFLUX_CONTEXT_TYPE` - Current context type (e.g., "task")
- `SPECFLUX_CONTEXT_REF` - Context reference for API calls (e.g., "SPEC-T42")

Use these to automatically determine which project/task you're working with.

## Usage

```
/task <task-ref>
```

Task ref can be display key (PROJ-42) or public ID (task_xxx).

## Process

1. **Fetch Task Context via API**
   ```
   GET /api/projects/{projectRef}/tasks/{taskRef}
   GET /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria
   GET /api/projects/{projectRef}/tasks/{taskRef}/dependencies
   ```

2. **Get Epic Context** (if task belongs to epic)
   ```
   GET /api/projects/{projectRef}/epics/{epicRef}
   GET /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria
   ```

3. **Update Task Status**
   ```
   PATCH /api/projects/{projectRef}/tasks/{taskRef}
   {"status": "IN_PROGRESS"}
   ```

4. **Work Through Acceptance Criteria**
   - Implement each requirement
   - Write tests as appropriate
   - Mark criteria complete via API:
     ```
     PUT /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria/{id}
     {"isMet": true}
     ```

5. **On Completion**
   - Mark task complete:
     ```
     PATCH /api/projects/{projectRef}/tasks/{taskRef}
     {"status": "COMPLETED"}
     ```
   - Create PR if appropriate
   - Write chain output for downstream tasks (in state file)

## State File

Progress is tracked in `.specflux/task-states/task-{id}-state.md`:

```markdown
# Task {displayKey} State

## Progress Log
- [timestamp] Started working on task
- [timestamp] Completed criterion 1
- [timestamp] Completed criterion 2

## Chain Output
{Summary for downstream tasks - what was implemented, key decisions, files modified}
```

## Example Session

```
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
```
