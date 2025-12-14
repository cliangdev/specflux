# /implement - Implement an Epic

Implement an epic directly, working through acceptance criteria.

**Skill**: Use `specflux-api` skill for API reference.

## Context from Environment

The terminal session provides context via environment variables:
- `SPECFLUX_PROJECT_REF` - Project reference for API calls (e.g., "SPEC")
- `SPECFLUX_CONTEXT_TYPE` - Current context type (e.g., "epic")
- `SPECFLUX_CONTEXT_REF` - Context reference for API calls (e.g., "SPEC-E1")

Use these to automatically determine which project/epic you're working with.

## Usage

```
/implement <epic-ref>
```

Epic ref can be display key (PROJ-E1), public ID (epic_xxx), or epic title.

## Process

1. **Fetch Epic Context via API**
   ```
   GET /api/projects/{projectRef}/epics/{epicRef}
   GET /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria
   GET /api/projects/{projectRef}/tasks?epicRef={epicRef}
   ```

2. **Update Epic Status**
   ```
   PUT /api/projects/{projectRef}/epics/{epicRef}
   {"status": "IN_PROGRESS"}
   ```

3. **If Epic Has Tasks**: Work through tasks in dependency order
   - For each task:
     a. Update task status to IN_PROGRESS:
        ```
        PATCH /api/projects/{projectRef}/tasks/{taskRef}
        {"status": "IN_PROGRESS"}
        ```
     b. Implement the task
     c. Get task acceptance criteria and mark each as met:
        ```
        GET /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria
        PUT /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria/{id}
        {"isMet": true}
        ```
     d. Update task status to COMPLETED:
        ```
        PATCH /api/projects/{projectRef}/tasks/{taskRef}
        {"status": "COMPLETED"}
        ```

4. **If Epic Has No Tasks**: Work through acceptance criteria directly
   - For each criterion:
     - Plan the implementation approach
     - Implement the requirement
     - Write tests to verify
     - Mark complete via API:
       ```
       PUT /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria/{id}
       {"isMet": true}
       ```

5. **Mark Epic Acceptance Criteria**
   - After all tasks complete, verify and mark epic-level acceptance criteria:
     ```
     GET /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria
     PUT /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria/{id}
     {"isMet": true}
     ```

6. **On Completion**
   - Verify ALL acceptance criteria (both task and epic level) are met
   - Update epic status:
     ```
     PUT /api/projects/{projectRef}/epics/{epicRef}
     {"status": "COMPLETED"}
     ```
   - Suggest creating a PR for review

## Recommended Skills

Depending on the epic type, activate relevant skills:
- **Backend work**: `api-design`, `typescript-patterns`, `database-migrations`
- **Frontend work**: `ui-patterns`, `typescript-patterns`
- **Full-stack**: All relevant skills

## Example Session

```
> /implement authentication

Fetching epic "Authentication" from API...

**Epic: Authentication** (PROJ-E1)
Status: PLANNING

**Epic Acceptance Criteria:**
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

=== Task PROJ-42: Database schema for users ===
Updating task status to IN_PROGRESS...
[Implementation...]
Marking task acceptance criteria as met...
Updating task status to COMPLETED...

=== Task PROJ-43: Signup API endpoint ===
Updating task status to IN_PROGRESS...
[Implementation...]
Marking task acceptance criteria as met...
Updating task status to COMPLETED...

=== Task PROJ-44: Login API endpoint ===
Updating task status to IN_PROGRESS...
[Implementation...]
Marking task acceptance criteria as met...
Updating task status to COMPLETED...

All tasks complete!
Verifying and marking epic acceptance criteria...
- [✓] Users can sign up with email/password
- [✓] Users can log in with credentials
- [✓] Password reset via email
- [✓] JWT tokens for session management

Updating epic status to COMPLETED...

Epic complete! Ready for review.
```
