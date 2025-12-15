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

2. **Get PRD Reference** (if epic is linked to a PRD)
   - Fetch PRD documents to understand the original requirements
   - Note any wireframes, specifications, or acceptance criteria in the PRD
   - **These are the source of truth for verification**

3. **Update Epic Status**
   ```
   PUT /api/projects/{projectRef}/epics/{epicRef}
   {"status": "IN_PROGRESS"}
   ```

4. **If Epic Has Tasks**: Work through tasks in dependency order
   - Use `/task <taskRef>` for each task
   - Or implement directly and update task status via API
   - **CRITICAL**: Each task must pass verification before marking complete (see Step 5)

5. **If Epic Has No Tasks**: Work through acceptance criteria directly
   - For each criterion:
     - Plan the implementation approach
     - Implement the requirement
     - Write tests to verify
     - **Verify criterion is actually met** (see Verification section)
     - Mark complete via API:
       ```
       PUT /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria/{id}
       {"isMet": true}
       ```

6. **Verify Before Completion (CRITICAL)**

   **Do NOT mark epic as COMPLETED until ALL of the following are verified:**

   a. **All acceptance criteria verified**:
      - Re-read each acceptance criterion
      - Verify the implementation actually satisfies it (not just "related to it")
      - For UI criteria: visually confirm the element exists and behaves correctly
      - For API criteria: confirm endpoint/response matches spec

   b. **PRD requirements verified** (if linked to PRD):
      - Re-read PRD wireframes/specifications
      - Check every element in wireframe is implemented
      - Reference PRD line numbers if available

   c. **Present verification checklist to user**:
      ```
      ## Verification Checklist

      ### Epic Acceptance Criteria
      - [x] AC1: Users can sign up with email → Verified: SignupForm.tsx, tested
      - [x] AC2: Password min 8 chars → Verified: validation in auth.ts:45

      ### PRD Requirements (lines 45-80)
      - [x] Registration form with email field → SignupForm.tsx:23
      - [x] Password strength indicator → PasswordStrength.tsx
      - [ ] Social login buttons → NOT IMPLEMENTED (out of scope?)

      ### Gaps Found
      - Social login buttons shown in PRD wireframe but not implemented

      Proceed with marking epic complete? (y/n)
      ```

   d. **Get user confirmation** before marking complete

7. **On Completion** (only after verification passes)
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
PRD: User Management PRD (PRD-001)

**Acceptance Criteria:**
- [ ] Users can sign up with email/password
- [ ] Users can log in with credentials
- [ ] Password reset via email
- [ ] JWT tokens for session management

**Tasks:**
- PROJ-42: Database schema for users [BACKLOG]
- PROJ-43: Signup API endpoint [BACKLOG]
- PROJ-44: Login API endpoint [BACKLOG]

Fetching PRD documents for verification reference...
PRD wireframe shows: signup form, login form, password reset flow (lines 45-120)

Updating epic status to IN_PROGRESS...

This epic has 3 tasks. I'll work through them in order.

Starting with PROJ-42: Database schema for users...

[Implementation proceeds via /task PROJ-42]
[Each task verified against its acceptance criteria before marking complete]

All tasks implemented. Running verification...

## Verification Checklist

### Epic Acceptance Criteria
- [x] AC1: Users can sign up with email/password → SignupForm.tsx + POST /auth/register
- [x] AC2: Users can log in with credentials → LoginForm.tsx + POST /auth/login
- [x] AC3: Password reset via email → ResetPassword.tsx + POST /auth/reset
- [x] AC4: JWT tokens for session management → auth.service.ts:78

### PRD Requirements (lines 45-120)
- [x] Signup form with email/password fields → SignupForm.tsx:15-45
- [x] Login form with remember me checkbox → LoginForm.tsx:20-50
- [x] Password reset email flow → ResetPassword.tsx, email.service.ts
- [x] Error messages for invalid credentials → auth.service.ts:90-110

### Gaps Found
None - all PRD requirements covered.

All criteria verified. Proceed with marking epic complete? → yes

Updating epic status to COMPLETED...
Epic complete! Ready for review.
```
