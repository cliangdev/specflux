# /task - Work on a Specific Task

Work on a specific task from SpecFlux.

**Skill**: Use `specflux-api` skill for API reference.

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

2. **Get Epic & PRD Context** (if task belongs to epic)
   ```
   GET /api/projects/{projectRef}/epics/{epicRef}
   GET /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria
   ```
   - If epic has PRD reference, fetch PRD documents
   - Note any PRD line references in task description (e.g., "PRD lines 384-388")
   - **PRD is the source of truth for verification**

3. **Update Task Status**
   ```
   PATCH /api/projects/{projectRef}/tasks/{taskRef}
   {"status": "IN_PROGRESS"}
   ```

4. **Work Through Acceptance Criteria**
   - Implement each requirement
   - Write tests as appropriate
   - **Do NOT mark criteria complete yet** - wait for verification step

5. **Verify Before Completion (CRITICAL)**

   **Do NOT mark task as COMPLETED until ALL criteria are verified:**

   a. **Re-read each acceptance criterion**:
      - Verify implementation actually satisfies it (not just "related to it")
      - For UI: element exists, positioned correctly, behaves as specified
      - For API: endpoint exists, request/response matches spec
      - For data: schema matches, validations work

   b. **Check PRD reference** (if task description includes PRD lines):
      - Re-read the referenced PRD section
      - Verify every element mentioned in PRD is implemented
      - If PRD shows a wireframe, verify UI matches it

   c. **Present verification to user**:
      ```
      ## Task Verification

      ### Acceptance Criteria
      - [x] AC1: Add Epics section below documents
            → Verified: PRDDetailPage.tsx:145-180, shows epic list
      - [x] AC2: Each epic shows key, title, status, progress bar
            → Verified: EpicRow.tsx:20-45, all elements present
      - [ ] AC3: "+ Add" button to create epic
            → NOT IMPLEMENTED - missing button

      ### PRD Reference (lines 384-388)
      - [x] Epic rows with progress bars → EpicRow.tsx
      - [ ] "+ Add" button in section header → MISSING

      ### Gaps Found
      - Missing "+ Add" button for creating epics

      Fix gaps before marking complete? (y/n)
      ```

   d. **Fix any gaps** before proceeding

   e. **Mark criteria complete via API** (only after verification):
      ```
      PUT /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria/{id}
      {"isMet": true}
      ```

6. **On Completion** (only after all criteria verified)
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
PRD Reference: lines 45-52 (user data model)
Priority: HIGH

**Acceptance Criteria:**
- [ ] User table with id, email, password_hash, created_at
- [ ] Unique constraint on email
- [ ] Index on email for login lookups

**Dependencies:** None

Fetching PRD lines 45-52 for verification reference...

Updating status to IN_PROGRESS...

Starting implementation...

Creating migration file at migrations/001_users_table.sql...

[Implementation proceeds]

Running verification...

## Task Verification

### Acceptance Criteria
- [x] AC1: User table with id, email, password_hash, created_at
      → Verified: migrations/001_users_table.sql:5-10
- [x] AC2: Unique constraint on email
      → Verified: migrations/001_users_table.sql:12 (UNIQUE constraint)
- [x] AC3: Index on email for login lookups
      → Verified: migrations/001_users_table.sql:15 (CREATE INDEX)

### PRD Reference (lines 45-52)
- [x] id field (UUID) → line 5
- [x] email field (VARCHAR 255) → line 6
- [x] password_hash field → line 7
- [x] created_at timestamp → line 8

### Gaps Found
None - all requirements implemented.

All criteria verified. Marking as complete...

Updating status to COMPLETED...

Task PROJ-42 complete. Dependent tasks are now unblocked.
```
