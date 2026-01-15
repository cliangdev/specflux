---
name: specflux-coding
description: Implementation workflow for SpecFlux projects. Enforces test-first development, one commit per task, and API status updates. This skill is always active when writing code in SpecFlux projects.
---

# SpecFlux Coding Workflow

When implementing code in a SpecFlux project, you MUST follow this workflow exactly. No exceptions.

## CRITICAL: Pre-Flight Checks

**BEFORE writing any code, you MUST complete these checks. If any fail, STOP and inform the user.**

### 1. Verify API Access
```bash
# Test API connectivity
curl -s -w "%{http_code}" -o /dev/null "$SPECFLUX_API_URL/api/health"
```

**If SPECFLUX_API_URL is not set or API is unreachable:**
- STOP immediately
- Inform user: "Cannot proceed - SpecFlux API is not accessible. Please ensure SPECFLUX_API_URL is set and the API is running."
- Do NOT proceed with implementation

### 2. Verify Task Exists
```bash
# Fetch task details
GET /api/projects/{projectRef}/tasks/{taskRef}
```

**If task not found or API returns error:**
- STOP immediately
- Inform user of the error
- Do NOT proceed with implementation

### 3. Mark Task IN_PROGRESS
```bash
PATCH /api/projects/{projectRef}/tasks/{taskRef}
{"status": "IN_PROGRESS"}
```

**If status update fails:**
- STOP immediately
- Inform user: "Cannot update task status. Please check API access."
- Do NOT proceed with implementation

## MANDATORY Workflow

You MUST follow these steps IN ORDER. Skipping steps is NOT allowed.

```
┌─────────────────────────────────────────────────────────────────┐
│                    MANDATORY WORKFLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BEFORE CODING (all steps required):                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ □ 1. Verify API access (STOP if fails)                   │   │
│  │ □ 2. Fetch task details from API                         │   │
│  │ □ 3. Mark task IN_PROGRESS via API                       │   │
│  │ □ 4. Read acceptance criteria from API                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  DURING CODING:                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ □ 5. Write tests for each acceptance criterion           │   │
│  │ □ 6. Implement until ALL tests pass                      │   │
│  │ □ 7. Run full test suite                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  AFTER CODING (all steps required):                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ □ 8. Mark each acceptance criterion as met via API       │   │
│  │ □ 9. Commit with task reference: "TASK-REF: description" │   │
│  │ □ 10. Mark task COMPLETED via API                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  AFTER ALL TASKS IN EPIC:                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ □ 11. Mark epic COMPLETED via API                        │   │
│  │ □ 12. Create PR with epic reference                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Details

### Step 1-3: Pre-Flight (MANDATORY)

```bash
# 1. Check API URL is set
echo $SPECFLUX_API_URL  # Must not be empty

# 2. Fetch task
curl -s "$SPECFLUX_API_URL/api/projects/{projectRef}/tasks/{taskRef}"

# 3. Mark IN_PROGRESS
curl -s -X PATCH "$SPECFLUX_API_URL/api/projects/{projectRef}/tasks/{taskRef}" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

### Step 4: Read Acceptance Criteria

```bash
curl -s "$SPECFLUX_API_URL/api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria"
```

### Steps 5-7: Test-First Development

1. **Write tests FIRST** - Each acceptance criterion needs at least one test
2. **Tests should fail initially** - No implementation yet
3. **Implement until ALL tests pass**
4. **Run full test suite** - Ensure no regressions

### Step 8: Mark Criteria Met

For EACH acceptance criterion:
```bash
curl -s -X PUT "$SPECFLUX_API_URL/api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria/{id}" \
  -H "Content-Type: application/json" \
  -d '{"isMet": true}'
```

### Step 9: Commit

```bash
git add .
git commit -m "TASK-REF: brief description

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Step 10: Mark Task COMPLETED

```bash
curl -s -X PATCH "$SPECFLUX_API_URL/api/projects/{projectRef}/tasks/{taskRef}" \
  -H "Content-Type: application/json" \
  -d '{"status": "COMPLETED"}'
```

**If this fails, you MUST retry or inform the user. Do NOT leave tasks in IN_PROGRESS state.**

### Steps 11-12: Epic Completion

After ALL tasks in an epic are done:

```bash
# Mark epic completed
curl -s -X PATCH "$SPECFLUX_API_URL/api/projects/{projectRef}/epics/{epicRef}" \
  -H "Content-Type: application/json" \
  -d '{"status": "COMPLETED"}'

# Create PR
gh pr create --title "EPIC-REF: Epic title" --body "..."
```

## MUST NOT Rules

You MUST NOT:
- Start coding without marking task IN_PROGRESS
- Skip writing tests for acceptance criteria
- Commit without all tests passing
- Leave task in IN_PROGRESS after completing work
- Forget to mark epic COMPLETED when all tasks are done
- Create PR without updating epic status
- Proceed with implementation if API calls fail

## Error Handling

### API Unavailable
```
STOP. Inform user:
"SpecFlux API is not accessible. Please ensure:
1. SPECFLUX_API_URL environment variable is set
2. API server is running
3. Network connectivity is available"
```

### Status Update Fails
```
RETRY once. If still fails:
"Failed to update task/epic status via API. Please manually update:
- Task {taskRef} → {status}
- Epic {epicRef} → {status} (if applicable)"
```

### Tests Failing
```
Do NOT commit. Do NOT mark task complete.
Continue debugging until ALL tests pass.
```

## API Quick Reference

```bash
# Task operations
GET    /api/projects/{projectRef}/tasks/{taskRef}
PATCH  /api/projects/{projectRef}/tasks/{taskRef}  {"status": "IN_PROGRESS|COMPLETED|BLOCKED"}

# Acceptance criteria
GET    /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria
PUT    /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria/{id}  {"isMet": true}

# Epic operations
GET    /api/projects/{projectRef}/epics/{epicRef}
PATCH  /api/projects/{projectRef}/epics/{epicRef}  {"status": "IN_PROGRESS|COMPLETED"}
```

## Verification Checklist

Before saying "task complete", verify:
- [ ] Task status is COMPLETED in API (not just locally)
- [ ] All acceptance criteria marked as met in API
- [ ] Commit exists with task reference
- [ ] If last task in epic: epic status is COMPLETED
- [ ] If last task in epic: PR has been created or offered
