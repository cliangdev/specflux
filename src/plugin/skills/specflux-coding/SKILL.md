---
name: specflux-coding
description: Implementation workflow for SpecFlux projects. Enforces test-first development, one commit per task, and API status updates. This skill is always active when writing code in SpecFlux projects.
---

# SpecFlux Coding Workflow

When implementing code in a SpecFlux project, ALWAYS follow this workflow.

## Core Principles

1. **Task is the smallest unit of work**
2. **Tests first** - Turn acceptance criteria into tests before coding
3. **One commit per task** - Commit only when all tests pass
4. **Update API** - Mark criteria as met when task completes

## Implementation Loop

For each task:

```
1. Start Task
   └─► PATCH /api/projects/{projectRef}/tasks/{taskRef} {"status": "IN_PROGRESS"}

2. Read Acceptance Criteria
   └─► GET /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria

3. Write Tests First
   └─► For each acceptance criterion, write a corresponding test
   └─► Tests should be failing initially (no implementation yet)

4. Implement Until All Tests Pass
   └─► Write code to make tests pass
   └─► Run tests frequently
   └─► Continue until ALL tests pass

5. Mark Criteria Complete
   └─► PUT /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria/{id} {"isMet": true}

6. Commit (One Per Task)
   └─► git add .
   └─► git commit -m "TASK-REF: brief description"

7. Update Task Status
   └─► PATCH /api/projects/{projectRef}/tasks/{taskRef} {"status": "COMPLETED"}
```

## Test-First Approach

### Why Tests First?

- Acceptance criteria become executable specifications
- Forces clarity on expected behavior before coding
- Provides immediate feedback during implementation
- Ensures all criteria are verifiable

### Test Mapping

Map each acceptance criterion to at least one test:

| Criterion Type | Test Type |
|----------------|-----------|
| Business logic | Unit test |
| API behavior | Integration test |
| User interaction | Component/E2E test |
| Data validation | Unit test |

### Example

**Acceptance Criteria:**
1. User profile table with avatar_url, bio, preferences
2. Migration script with rollback support
3. Repository with CRUD operations

**Tests First:**
```kotlin
// 1. Table structure test
@Test
fun `user profile table has required columns`() {
    // Test migration creates correct schema
}

// 2. Rollback test
@Test
fun `migration rollback removes profile table`() {
    // Test rollback works
}

// 3. Repository tests
@Test
fun `repository creates user profile`() { }

@Test
fun `repository reads user profile by id`() { }

@Test
fun `repository updates user profile`() { }

@Test
fun `repository deletes user profile`() { }
```

**Then implement until all tests pass.**

## Commit Guidelines

### One Commit Per Task

- Each task gets exactly one commit
- Commit only when ALL acceptance criteria tests pass
- Keep commit messages concise

### Commit Message Format

```
TASK-REF: brief description of what was implemented

Optional: 1-2 lines of context if needed
```

**Good examples:**
- `SPEC-55: add user profile data model and migrations`
- `SPEC-56: implement profile API endpoints with validation`
- `SPEC-57: add profile settings UI with form validation`

**Avoid:**
- Long lists of acceptance criteria
- Implementation details (belong in code/comments)
- Verbose boilerplate

## Handling Failures

### Tests Failing

If tests fail during implementation:
1. Debug and fix the code
2. Do NOT commit until all tests pass
3. Keep iterating until green

### Blocked Tasks

If a task cannot be completed:
1. Update status: `{"status": "BLOCKED"}`
2. Inform the user of the blocker
3. Move to the next task if possible

## Epic Completion

When all tasks in an epic are complete:

1. **Verify epic acceptance criteria**
   ```
   GET /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria
   ```

2. **Mark epic criteria as met**
   ```
   PUT /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria/{id} {"isMet": true}
   ```

3. **Update epic status**
   ```
   PUT /api/projects/{projectRef}/epics/{epicRef} {"status": "COMPLETED"}
   ```

4. **Suggest PR creation**
   - Summarize all completed tasks
   - List key changes
   - Offer to create PR

## Code Quality

While implementing:

- Follow existing project patterns (check similar files first)
- Keep changes focused on the task
- No unrelated refactoring
- Match project coding style

## API Quick Reference

```bash
# Task status
PATCH /api/projects/{projectRef}/tasks/{taskRef}
{"status": "IN_PROGRESS|COMPLETED|BLOCKED"}

# Get criteria
GET /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria

# Mark criterion met
PUT /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria/{id}
{"isMet": true}

# Epic status
PUT /api/projects/{projectRef}/epics/{epicRef}
{"status": "IN_PROGRESS|COMPLETED"}
```

## Summary

```
┌─────────────────────────────────────────────────┐
│           SPECFLUX CODING WORKFLOW              │
├─────────────────────────────────────────────────┤
│                                                 │
│  For each TASK:                                 │
│                                                 │
│  1. Mark task IN_PROGRESS                       │
│  2. Read acceptance criteria                    │
│  3. Write tests for each criterion              │
│  4. Implement until all tests pass              │
│  5. Mark criteria as met via API                │
│  6. ONE commit for the task                     │
│  7. Mark task COMPLETED                         │
│                                                 │
│  When all tasks done:                           │
│  → Mark epic COMPLETED                          │
│  → Suggest PR                                   │
│                                                 │
└─────────────────────────────────────────────────┘
```
