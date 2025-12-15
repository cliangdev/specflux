# /epic - Break Down PRD into Epics and Tasks

Transform a PRD into actionable epics and tasks ready for AI implementation.

**Skill**: Use `specflux-api` skill for all API operations.

## Context from Environment

The terminal session provides context via environment variables:
- `SPECFLUX_PROJECT_REF` - Project reference for API calls (e.g., "SPEC")
- `SPECFLUX_CONTEXT_TYPE` - Current context type (e.g., "prd" or "prd-workshop")
- `SPECFLUX_CONTEXT_ID` - PRD ID (e.g., "prd_abc123")
- `SPECFLUX_CONTEXT_REF` - Display key (e.g., "SPEC-P1")
- `SPECFLUX_CONTEXT_TITLE` - PRD title

Use these to automatically determine which project/PRD you're working with. When `SPECFLUX_CONTEXT_TYPE` is "prd" and `SPECFLUX_CONTEXT_ID` is set, you already know which PRD to work with.

## Process

### Phase 1: Understand the PRD

1. **Get context from environment**, then fetch PRD:
   ```
   # projectRef from $SPECFLUX_PROJECT_REF
   # prdRef from $SPECFLUX_CONTEXT_ID (when context type is "prd" or "prd-workshop")
   GET /api/projects/{projectRef}/prds/{prdRef}
   GET /api/projects/{projectRef}/prds/{prdRef}/documents
   ```

   The PRD is: **$SPECFLUX_CONTEXT_TITLE** ($SPECFLUX_CONTEXT_REF)

2. **Read all documents** - primary PRD and supporting files (wireframes, mockups)

3. **Clarify ambiguities** - Ask about unclear requirements, scope, integrations. Don't proceed until you have clear answers.

### Phase 2: Design Epics

1. **Break PRD into epics** by feature domain, user journey, or technical layer

2. **Order by dependencies** - Create independent epics FIRST, then dependent ones

3. **Write self-contained epic descriptions** - AI should be able to code from the epic alone:
   - Context & user stories
   - Scope (what's IN and OUT)
   - Technical approach & data model
   - API contracts
   - Edge cases

4. **Add high-level acceptance criteria (3-5)** focused on outcomes:
   - Good: "Users can complete purchase end-to-end in under 2 minutes"
   - Bad: "API returns 200" (too low-level, belongs in tasks)

### Phase 3: Create Epics via API

**IMPORTANT**: Always include `prdRef` to link epics back to their source PRD. This maintains traceability from requirements to implementation.

```
POST /api/projects/{projectRef}/epics
{
  "title": "...",
  "description": "...",
  "prdRef": "{prdRef}",           // REQUIRED - links epic to source PRD
  "releaseRef": "{releaseRef}",   // Optional - assigns to a release
  "acceptanceCriteria": [         // REQUIRED - array of criteria objects
    {"criteria": "..."},
    {"criteria": "..."}
  ]
}

# Add dependencies if epic depends on other epics
POST /api/projects/{projectRef}/epics/{epicRef}/dependencies
{ "dependsOnEpicRef": "..." }
```

**Note**: The `prdRef` can be the PRD's displayKey (e.g., "SPEC-P1") or internal ID (e.g., "prd_xxx"). Get it from:
- Environment: `$SPECFLUX_CONTEXT_ID` when context type is "prd" or "prd-workshop"
- API response when fetching the PRD

### Phase 4: Create Tasks

1. **Break each epic into 1-4 hour tasks**

2. **Write immediately actionable task descriptions**:
   - Objective (one sentence)
   - Files to create/modify
   - Implementation details (endpoints, schemas, validation)
   - Error handling

3. **Add verifiable acceptance criteria** - each must be testable:
   - `[Unit]` "hashPassword returns bcrypt hash with cost 12"
   - `[Integration]` "POST /auth/register returns 201 for valid input"
   - `[E2E]` "User completes registration and sees welcome message"

```
POST /api/projects/{projectRef}/tasks
{ "epicRef": "...", "title": "...", "description": "...", "priority": "HIGH|MEDIUM|LOW" }

POST /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria
{ "criteria": "..." }

POST /api/projects/{projectRef}/tasks/{taskRef}/dependencies
{ "dependsOnTaskRef": "..." }
```

### Phase 5: Verify Coverage

Present coverage matrix to user:
- Every PRD requirement → Epic → Tasks
- No gaps between PRD and implementation
- Get user approval before finalizing

## Example

```
> /epic

Reading PRD "E-commerce MVP" and documents...

Questions before proceeding:
1. Payment gateway preference? → Stripe
2. Social login for MVP? → No, email only

## Proposed Epics

**E1: User Authentication** (independent)
Context: Secure user access - foundation for all features.
Scope IN: Email/password, password reset, JWT sessions
Scope OUT: Social login, 2FA
Technical: bcrypt (cost 12), JWT (24h), httpOnly cookies
API: POST /auth/register, /login, /forgot-password, /reset-password
Acceptance Criteria:
1. Users can self-register and immediately access platform
2. Users can recover access without support intervention
3. Auth meets security best practices

**E2: Product Catalog** (independent)
[...]

**E3: Shopping Cart** (depends: E1, E2)
[...]

Proceed with creating epics and tasks? → yes

Creating E1: User Authentication...

**Task 1.1: User database schema**
Objective: Create users and password_reset_tokens tables
Files: migrations/001_create_users.sql
Schema: users(id, email UNIQUE, password_hash, timestamps)
Acceptance:
- [Unit] Migration creates tables with correct columns
- [Unit] Email uniqueness rejects duplicates

**Task 1.2: Registration endpoint**
Objective: POST /api/auth/register
Files: src/routes/auth.ts
Request: { email, password } → 201 { user, token }
Validation: email format, password min 8 chars
Errors: 400 invalid input, 409 duplicate email
Acceptance:
- [Integration] Returns 201 with token for valid input
- [Integration] Returns 409 for duplicate email
- [Unit] Password hashed with bcrypt cost 12

[...]

## Coverage Report
| PRD Requirement | Epic | Tasks | ✓ |
|-----------------|------|-------|---|
| Registration    | E1   | 1.1-2 | ✓ |
| Product browse  | E2   | 2.1-3 | ✓ |
All requirements covered.
```

## Key Principles

1. **Ask first** - Clarify ambiguities before designing
2. **Self-contained** - Epics and tasks include all context needed to code
3. **Independent first** - Create non-dependent epics/tasks before dependent ones
4. **Testable criteria** - Every acceptance criterion is verifiable
5. **No gaps** - 100% PRD coverage verified before finishing
