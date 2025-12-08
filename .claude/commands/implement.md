# /implement - Implement an Epic

Implement an epic directly, working through acceptance criteria.

**Skill**: Use `specflux-api` skill for API reference.

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
   - Use `/task <taskRef>` for each task
   - Or implement directly and update task status via API

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

5. **On Completion**
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
```
